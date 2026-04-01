#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use once_cell::sync::Lazy;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::Emitter;

enum AuthState {
    Init,
    JumpPassword,
    TargetPassword,
    Connected,
    Failed,
}

struct SSHState {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
}

static SSH_SESSIONS: Lazy<Mutex<HashMap<String, SSHState>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(serde::Deserialize, Clone)]
struct JumpHost {
    host: String,
    user: String,
    password: Option<String>,
    private_key: Option<String>,
    passphrase: Option<String>,
}

#[tauri::command]
fn ssh_connect(
    app: tauri::AppHandle,
    session_id: String,
    host: String,
    user: String,
    password: Option<String>,
    private_key: Option<String>,
    passphrase: Option<String>,
    jump_host: Option<JumpHost>,
) -> Result<String, String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 40,
            cols: 120,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new("ssh");

    cmd.arg("-tt");

    cmd.arg("-o"); cmd.arg("StrictHostKeyChecking=no");
    cmd.arg("-o"); cmd.arg("UserKnownHostsFile=/dev/null");
    cmd.arg("-o"); cmd.arg("HostKeyAlgorithms=+ssh-rsa");
    cmd.arg("-o"); cmd.arg("PubkeyAcceptedAlgorithms=+ssh-rsa");

    let mut jump_key_path: Option<String> = None;

    if let Some(jump) = &jump_host {
        if let Some(ref key) = jump.private_key {
            let path = format!("/tmp/jump_key_{}", session_id);
            std::fs::write(&path, key).map_err(|e| e.to_string())?;

            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).ok();

            jump_key_path = Some(path);
        }
    }

    if let Some(jump) = &jump_host {
        let mut proxy_cmd = String::from("ssh ");

        proxy_cmd.push_str("-o StrictHostKeyChecking=no ");
        proxy_cmd.push_str("-o UserKnownHostsFile=/dev/null ");
        proxy_cmd.push_str("-o HostKeyAlgorithms=+ssh-rsa ");
        proxy_cmd.push_str("-o PubkeyAcceptedAlgorithms=+ssh-rsa ");

        if let Some(ref path) = jump_key_path {
            proxy_cmd.push_str(&format!("-i {} -o IdentitiesOnly=yes ", path));
        }

        proxy_cmd.push_str(&format!("-W %h:%p {}@{}", jump.user, jump.host));

        cmd.arg("-o");
        cmd.arg(format!("ProxyCommand={}", proxy_cmd));
    }

    if let Some(key) = private_key {
        let key_path = format!("/tmp/ssh_key_{}", session_id);
        std::fs::write(&key_path, key).map_err(|e| e.to_string())?;

        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&key_path, std::fs::Permissions::from_mode(0o600)).ok();

        cmd.arg("-i");
        cmd.arg(key_path);
    }

    cmd.arg(format!("{}@{}", user, host));

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let child = Arc::new(Mutex::new(child));

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let writer = Arc::new(Mutex::new(writer));

    let writer_clone = writer.clone();
    let app_handle = app.clone();
    let sid = session_id.clone();

    let jump_password = jump_host.clone().and_then(|j| j.password);
    let jump_passphrase = jump_host.clone().and_then(|j| j.passphrase);
    let target_password = password;
    let target_passphrase = passphrase;

    thread::spawn(move || {
        let mut buffer = [0u8; 8192];
        let mut state = AuthState::Init;

        loop {
            match reader.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    let output = String::from_utf8_lossy(&buffer[..n]).to_string();

                    let _ = app_handle.emit(
                        &format!("ssh-output-{}", sid),
                        output.clone(),
                    );

                    let text = output.to_lowercase();
                    let mut w = writer_clone.lock().unwrap();

                    match state {
                        AuthState::Init => {
                            if text.contains("password:") {
                                if let Some(ref jp) = jump_password {
                                    let _ = w.write_all(format!("{}\n", jp).as_bytes());
                                    state = AuthState::JumpPassword;
                                } else if let Some(ref tp) = target_password {
                                    let _ = w.write_all(format!("{}\n", tp).as_bytes());
                                    state = AuthState::TargetPassword;
                                }
                            } else if text.contains("enter passphrase") {
                                if text.contains("jump_key") {
                                    if let Some(ref pp) = jump_passphrase {
                                        let _ = w.write_all(format!("{}\n", pp).as_bytes());
                                    }
                                } else if text.contains("ssh_key") {
                                    if let Some(ref pp) = target_passphrase {
                                        let _ = w.write_all(format!("{}\n", pp).as_bytes());
                                    }
                                }
                            }
                        }

                        AuthState::JumpPassword => {
                            if text.contains("password:") {
                                if let Some(ref tp) = target_password {
                                    let _ = w.write_all(format!("{}\n", tp).as_bytes());
                                    state = AuthState::TargetPassword;
                                }
                            }
                        }

                        AuthState::TargetPassword => {
                            if text.contains("$") || text.contains("#") {
                                state = AuthState::Connected;
                            }
                        }

                        AuthState::Connected => {}
                        AuthState::Failed => break,
                    }

                    if text.contains("permission denied") {
                        state = AuthState::Failed;
                    }
                }
                Err(_) => break,
                _ => {}
            }
        }
    });

    SSH_SESSIONS.lock().unwrap().insert(
        session_id,
        SSHState { writer, child },
    );

    Ok("connected".into())
}

#[tauri::command]
fn ssh_write(session_id: String, input: String) -> Result<(), String> {
    if let Some(state) = SSH_SESSIONS.lock().unwrap().get(&session_id) {
        let mut writer = state.writer.lock().unwrap();
        writer.write_all(input.as_bytes()).map_err(|e| e.to_string())?;
        writer.flush().ok();
    }
    Ok(())
}

#[tauri::command]
fn ssh_disconnect(session_id: String) {
    if let Some(state) = SSH_SESSIONS.lock().unwrap().remove(&session_id) {
        let mut child = state.child.lock().unwrap();
        let _ = child.kill();
    }
}

#[derive(serde::Serialize)]
struct SSHKey {
    name: String,
    path: String,
    content: String,
}

#[derive(serde::Serialize)]
struct SSHHostConfig {
    host: String,
    hostname: Option<String>,
    user: Option<String>,
    identity_file: Option<String>,
}

#[tauri::command]
fn scan_ssh() -> Result<(Vec<SSHKey>, Vec<SSHHostConfig>), String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let ssh_path = format!("{}/.ssh", home);

    let mut keys = vec![];
    let mut hosts = vec![];

    if let Ok(entries) = std::fs::read_dir(&ssh_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let filename = path.file_name().unwrap().to_string_lossy();
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if content.contains("PRIVATE KEY") {
                        keys.push(SSHKey {
                            name: filename.to_string(),
                            path: path.to_string_lossy().to_string(),
                            content,
                        });
                    }
                }
            }
        }
    }

    let config_path = format!("{}/config", ssh_path);

    if let Ok(config) = std::fs::read_to_string(config_path) {
        let mut current: Option<SSHHostConfig> = None;

        for line in config.lines() {
            let line = line.trim();

            if line.starts_with("Host ") {
                if let Some(h) = current.take() {
                    hosts.push(h);
                }

                current = Some(SSHHostConfig {
                    host: line.replace("Host ", "").trim().to_string(),
                    hostname: None,
                    user: None,
                    identity_file: None,
                });
            }

            if let Some(ref mut h) = current {
                if line.starts_with("HostName ") {
                    h.hostname = Some(line.replace("HostName ", "").trim().to_string());
                }
                if line.starts_with("User ") {
                    h.user = Some(line.replace("User ", "").trim().to_string());
                }
                if line.starts_with("IdentityFile ") {
                    h.identity_file =
                        Some(line.replace("IdentityFile ", "").trim().to_string());
                }
            }
        }

        if let Some(h) = current {
            hosts.push(h);
        }
    }

    Ok((keys, hosts))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ssh_connect,
            ssh_write,
            ssh_disconnect,
            scan_ssh
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}