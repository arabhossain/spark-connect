mod ssh_builder;
mod ssh_parser;

use once_cell::sync::Lazy;
use portable_pty::{native_pty_system, PtySize};
use ssh_builder::SSHCommandBuilder;

use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;

use tauri::Emitter;

static SSH_SESSIONS: Lazy<Mutex<HashMap<String, SSHState>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

struct SSHState {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
    master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
    temp_files: Vec<String>,
}

#[derive(serde::Deserialize, Clone)]
struct JumpHost {
    host: String,
    user: String,
    password: Option<String>,
    private_key: Option<String>,
    passphrase: Option<String>,
}

#[derive(serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SSHOptions {
    #[serde(default)]
    strict_host_checking: bool,
    #[serde(default)]
    use_known_hosts: bool,
    #[serde(default)]
    allow_rsa: bool,
    #[serde(default)]
    use_agent: bool,
    proxy_command: Option<String>,
    identity_file: Option<String>,
    identities_only: Option<bool>,
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
    options: Option<SSHOptions>,
) -> Result<String, String> {
    let opts = options.clone().unwrap_or(SSHOptions {
        strict_host_checking: false,
        use_known_hosts: false,
        allow_rsa: true,
        use_agent: false,
        proxy_command: None,
        identity_file: None,
        identities_only: None,
    });

    let pty = native_pty_system();
    let pair = pty
        .openpty(PtySize {
            rows: 40,
            cols: 120,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut builder = SSHCommandBuilder::new();

    if !opts.strict_host_checking {
        builder.option("StrictHostKeyChecking", "no");
    }

    if !opts.use_known_hosts {
        builder.option("UserKnownHostsFile", "/dev/null");
    }

    if opts.allow_rsa {
        builder.option("HostKeyAlgorithms", "+ssh-rsa");
        builder.option("PubkeyAcceptedAlgorithms", "+ssh-rsa");
    }

    if opts.use_agent {
        builder.arg("-A");
    }

    let mut temp_files = vec![];
    let mut jump_key_path: Option<String> = None;

    if let Some(jump) = &jump_host {
        if let Some(key) = &jump.private_key {
            let path = format!("/tmp/jump_key_{}", session_id);
            std::fs::write(&path, key).map_err(|e| e.to_string())?;

            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).ok();

            temp_files.push(path.clone());
            jump_key_path = Some(path);
        }
    }

    let mut proxy_applied = false;

    if let Some(ref opts) = options {
        if let Some(proxy) = &opts.proxy_command {
            builder.option("ProxyCommand", proxy);
            proxy_applied = true;
        }
    }

    if !proxy_applied {
        if let Some(jump) = &jump_host {
            let mut proxy = String::from("ssh ");

            proxy.push_str("-F ~/.ssh/config ");
            proxy.push_str("-o HostKeyAlgorithms=+ssh-rsa ");
            proxy.push_str("-o PubkeyAcceptedAlgorithms=+ssh-rsa ");
            proxy.push_str("-o StrictHostKeyChecking=no ");
            proxy.push_str("-o UserKnownHostsFile=/dev/null ");

            if let Some(path) = &jump_key_path {
                proxy.push_str(&format!("-i {} -o IdentitiesOnly=yes ", path));
            }

            proxy.push_str(&format!(
                "-W %h:%p {}@{}",
                jump.user, jump.host
            ));

            builder.option("ProxyCommand", proxy);
        }
    }

    if let Some(ref opts) = options {
        if let Some(identity) = &opts.identity_file {
            builder.arg("-i");
            builder.arg(identity);
        }

        if opts.identities_only.unwrap_or(false) {
            builder.option("IdentitiesOnly", "yes");
        }
    }

    if let Some(key) = private_key {
        let path = format!("/tmp/key_{}", session_id);
        std::fs::write(&path, key).map_err(|e| e.to_string())?;

        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).ok();

        temp_files.push(path.clone());

        builder.arg("-i");
        builder.arg(path);
        builder.option("IdentitiesOnly", "yes");
    }

    builder.arg(format!("{}@{}", user, host));

    let cmd = builder.build();

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let child = Arc::new(Mutex::new(child));

    let mut reader = pair.master.try_clone_reader().unwrap();
    let writer = Arc::new(Mutex::new(pair.master.take_writer().unwrap()));

    {
        let mut w = writer.lock().unwrap();
        let _ = w.write_all(b"\n");
    }

    let writer_clone = writer.clone();
    let app_handle = app.clone();
    let sid = session_id.clone();

    let jump_password = jump_host.clone().and_then(|j| j.password);
    let jump_passphrase = jump_host.clone().and_then(|j| j.passphrase);
    let target_password = password;
    let target_passphrase = passphrase;

    thread::spawn(move || {
        let mut buffer = [0u8; 8192];

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

                    if text.contains("password") {
                        if let Some(ref jp) = jump_password {
                            let _ = w.write_all(format!("{}\n", jp).as_bytes());
                        } else if let Some(ref tp) = target_password {
                            let _ = w.write_all(format!("{}\n", tp).as_bytes());
                        }
                    }

                    if text.contains("passphrase") {
                        if text.contains("jump_key") {
                            if let Some(ref pp) = jump_passphrase {
                                let _ = w.write_all(format!("{}\n", pp).as_bytes());
                            }
                        } else {
                            if let Some(ref pp) = target_passphrase {
                                let _ = w.write_all(format!("{}\n", pp).as_bytes());
                            }
                        }
                    }
                }
                Ok(_) => {
                    let _ = app_handle.emit(
                        &format!("ssh-output-{}", sid),
                        "\r\n[SSH CONNECTION CLOSED]\r\n".to_string(),
                    );
                    break;
                }
                Err(_) => break,
            }
        }
    });

    SSH_SESSIONS.lock().unwrap().insert(
        session_id,
        SSHState {
            writer,
            child,
            master: Arc::new(Mutex::new(pair.master)),
            temp_files,
        },
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
fn ssh_resize(session_id: String, rows: u16, cols: u16) -> Result<(), String> {
    if let Some(state) = SSH_SESSIONS.lock().unwrap().get(&session_id) {
        let master = state.master.lock().unwrap();
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn ssh_disconnect(session_id: String) {
    if let Some(state) = SSH_SESSIONS.lock().unwrap().remove(&session_id) {
        let mut child = state.child.lock().unwrap();
        let _ = child.kill();

        for file in state.temp_files {
            let _ = std::fs::remove_file(file);
        }
    }
}

#[tauri::command]
fn scan_ssh() -> (Vec<String>, Vec<ssh_parser::SshHost>) {
    let ssh_dir = dirs::home_dir().unwrap().join(".ssh");
    let config_path = ssh_dir.join("config");

    let hosts = ssh_parser::parse_ssh_config(config_path.to_str().unwrap_or(""));

    let mut keys = vec![];

    if let Ok(entries) = std::fs::read_dir(&ssh_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name() {
                    let name = name.to_string_lossy();
                    if name.contains("id_") && !name.ends_with(".pub") {
                        keys.push(path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    (keys, hosts)
}

#[tauri::command]
fn read_ssh_config(paths: Vec<String>) -> Result<Vec<ssh_parser::SshHost>, String> {
    let mut all_hosts = Vec::new();
    
    for path in paths {
        let final_path = if path.starts_with("~") {
            let home = dirs::home_dir().ok_or("Could not find home directory")?;
            home.join(&path[2..]).to_str().ok_or("Invalid path")?.to_string()
        } else {
            path
        };
        let hosts = ssh_parser::parse_ssh_config(&final_path);
        all_hosts.extend(hosts);
    }

    // Deduplicate by host field
    let mut unique_hosts = HashMap::new();
    for h in all_hosts {
        unique_hosts.insert(h.host.clone(), h);
    }
    
    Ok(unique_hosts.into_values().collect())
}

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    let final_path = if path.starts_with("~") {
        let home = dirs::home_dir().ok_or("Could not find home directory")?;
        home.join(&path[2..]).to_str().ok_or("Invalid path")?.to_string()
    } else {
        path
    };
    std::fs::read_to_string(final_path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_default_ssh_config_path() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let path = home.join(".ssh").join("config");
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn get_ssh_dir() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let path = home.join(".ssh");
    Ok(path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default()
      .level(log::LevelFilter::Info)
      .build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
        ssh_connect,
        ssh_write,
        ssh_resize,
        ssh_disconnect,
        scan_ssh,
        read_ssh_config,
        read_file_content,
        get_default_ssh_config_path,
        get_ssh_dir
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
