import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import HostModal from "./components/HostModal";
import TerminalView from "./components/TerminalView";
import Tabs from "./components/Tabs";
import { invoke } from "@tauri-apps/api/core";
import { Toaster, toast } from "react-hot-toast";
import "./styles/tabs.css";

const API = "https://sparkconnect.codesparks.me";

export default function App() {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [mode, setMode] = useState("login");

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [hosts, setHosts] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingHost, setEditingHost] = useState(null);

    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);

    const [currentUser, setCurrentUser] = useState(
        localStorage.getItem("username")
    );

    const notify = {
        success: (msg) => toast.success(msg),
        error: (msg) => toast.error(msg),
        loading: (msg) => toast.loading(msg),
        dismiss: (id) => toast.dismiss(id)
    };

    useEffect(() => {
        document.body.style.margin = "0";
        document.body.style.background = "#000";
        document.body.style.overflow = "hidden";
        const disableRightClick = (e) => e.preventDefault();
        document.addEventListener("contextmenu", disableRightClick);

        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
        };

    }, []);

    useEffect(() => {
        const saved = localStorage.getItem("sessions");
        if (saved) {
            const parsed = JSON.parse(saved);
            setSessions(parsed);
            if (parsed.length > 0) setActiveSession(parsed[0].id);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("sessions", JSON.stringify(sessions));
    }, [sessions]);

    useEffect(() => {
        if (!sessions.length || !hosts.length) return;

        sessions.forEach(async (s) => {
            try {
                setSessions(prev =>
                    prev.map(sess =>
                        sess.id === s.id
                            ? { ...sess, reconnecting: true }
                            : sess
                    )
                );

                const host = s.host;

                let jumpHost = null;

                if (host.jumpHostId) {
                    const jh = hosts.find(h => h.id === host.jumpHostId);
                    if (jh) {
                        jumpHost = {
                            host: jh.host,
                            user: jh.user,
                            password: jh.password || null,
                            private_key: jh.sshKey || null,
                            passphrase: jh.passphrase || null
                        };
                    }
                }

                await invoke("ssh_connect", {
                    sessionId: s.id,
                    host: host.host,
                    user: host.user,
                    password: host.password || null,
                    privateKey: host.sshKey || null,
                    passphrase: host.passphrase || null,
                    jumpHost
                });

                setSessions(prev =>
                    prev.map(sess =>
                        sess.id === s.id
                            ? { ...sess, connected: true, reconnecting: false }
                            : sess
                    )
                );

            } catch {
                setSessions(prev =>
                    prev.map(sess =>
                        sess.id === s.id
                            ? { ...sess, connected: false, reconnecting: false }
                            : sess
                    )
                );
            }
        });
    }, [hosts]);

    const handleAuth = async () => {
        const loadingToast = notify.loading(
            mode === "login" ? "Logging in..." : "Registering..."
        );

        try {
            const endpoint = mode === "login" ? "/auth/login" : "/auth/register";

            const res = await fetch(API + endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            notify.dismiss(loadingToast);

            if (mode === "login") {
                localStorage.setItem("token", data.token);
                localStorage.setItem("username", username);
                setToken(data.token);

                notify.success("Login successful");
            } else {
                notify.success("Registered successfully");
                setMode("login");
            }
        } catch (err) {
            notify.dismiss(loadingToast);
            notify.error("Authentication failed");
        }
    };

    const logout = () => {
        localStorage.clear();
        setToken(null);
        setSessions([]);
        setActiveSession(null);
        setCurrentUser(null);
    };

    const fetchHosts = async () => {
        const res = await fetch(API + "/hosts", {
            headers: { Authorization: "Bearer " + token }
        });
        const data = await res.json();
        setHosts(data);
    };

    useEffect(() => {
        if (token) fetchHosts();
    }, [token]);

    const saveHost = async (host) => {
        const loadingToast = notify.loading("Saving host...");

        try {
            const url = editingHost
                ? `${API}/hosts/${editingHost.id}`
                : `${API}/hosts`;

            await fetch(url, {
                method: editingHost ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token,
                },
                body: JSON.stringify(host),
            });

            notify.dismiss(loadingToast);
            notify.success("Host saved");

            setModalOpen(false);
            setEditingHost(null);
            fetchHosts();
        } catch {
            notify.dismiss(loadingToast);
            notify.error("Failed to save host");
        }
    };

    const buildJumpHost = (host) => {
        if (!host.jumpHostId) return null;

        const jh = hosts.find(h => h.id === host.jumpHostId);
        if (!jh) return null;

        return {
            host: jh.host,
            user: jh.user,
            password: jh.password || null,
            private_key: jh.sshKey || null,
            passphrase: jh.passphrase || null
        };
    };

    const openSession = async (host) => {
        const id = crypto.randomUUID();

        const loadingToast = notify.loading(`Connecting to ${host.host}...`);

        const newSession = {
            id,
            host,
            connected: false,
            reconnecting: true
        };

        setSessions(prev => [...prev, newSession]);
        setActiveSession(id);

        try {
            await invoke("ssh_connect", {
                sessionId: id,
                host: host.host,
                user: host.user,
                password: host.password || null,
                privateKey: host.sshKey || null,
                passphrase: host.passphrase || null,
                jumpHost: buildJumpHost(host)
            });

            notify.dismiss(loadingToast);
            notify.success(`Connected to ${host.host}`);

            setSessions(prev =>
                prev.map(s =>
                    s.id === id
                        ? { ...s, connected: true, reconnecting: false }
                        : s
                )
            );

        } catch (err) {
            notify.dismiss(loadingToast);
            notify.error(`Failed to connect: ${host.host}`);

            setSessions(prev =>
                prev.map(s =>
                    s.id === id
                        ? { ...s, connected: false, reconnecting: false }
                        : s
                )
            );

            console.error(err);
        }
    };

    const closeSession = async (sessionId) => {
        try {
            await invoke("ssh_disconnect", { sessionId });
            notify.success("Session closed");
        } catch {
            notify.error("Failed to close session");
        }

        setSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId);
            if (activeSession === sessionId) {
                setActiveSession(updated[0]?.id || null);
            }
            return updated;
        });
    };

    const importSSH = async () => {
        const loading = notify.loading("Scanning ~/.ssh...");

        try {
            const [keys, hostsFromSSH] = await invoke("scan_ssh");

            let added = 0;

            for (const h of hostsFromSSH) {
                const host = h.hostname || h.host;
                const user = h.user || "root";

                // 🔍 skip duplicates
                const exists = hosts.some(existing =>
                    existing.host === host &&
                    existing.user === user
                );

                if (exists) continue;

                // ✅ save to DB
                await fetch(`${API}/hosts`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + token,
                    },
                    body: JSON.stringify({
                        name: h.host,
                        host,
                        user,
                        sshKey: null,
                    }),
                });

                added++;
            }

            notify.dismiss(loading);
            notify.success(`Imported ${added} hosts`);

            // refresh from DB
            fetchHosts();

        } catch (err) {
            notify.dismiss(loading);
            notify.error("Failed to import SSH config");
            console.error(err);
        }
    };

    const deleteHost = async (host) => {
        const confirm = window.confirm(`Delete ${host.name}?`);
        if (!confirm) return;

        try {
            await fetch(`${API}/hosts/${host.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: "Bearer " + token
                }
            });

            notify.success("Host deleted");
            fetchHosts();

        } catch {
            notify.error("Failed to delete host");
        }
    };

    if (!token) {
        return (
            <div style={{
                display: "flex",
                height: "100vh",
                overflow: "hidden",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                background: "#000",
                color: "#fff",
                gap: 10
            }}>
                <h2>{mode}</h2>

                <input
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />

                <button onClick={handleAuth}>Submit</button>

                <button onClick={() =>
                    setMode(mode === "login" ? "register" : "login")
                }>
                    Switch
                </button>
            </div>
        );
    }

    return (
        <>
        <Toaster position="top-right" reverseOrder={false} />
        <div style={{ display: "flex", height: "100vh", background: "#000" }}>

            <Sidebar
                hosts={hosts}
                onConnect={openSession}
                onAdd={() => {
                    setEditingHost(null);
                    setModalOpen(true);
                }}
                onEdit={(h) => {
                    setEditingHost(h);
                    setModalOpen(true);
                }}
                onLogout={logout}
                importSSH={importSSH}
                onDelete={deleteHost}
            />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "hidden" }}>

                <Tabs
                    sessions={sessions}
                    setSessions={setSessions}
                    activeSession={activeSession}
                    onSelect={setActiveSession}
                    onClose={closeSession}
                />

                <div style={{ flex: 1 , overflow: "hidden"}}>
                    {sessions.map(s => (
                        <div
                            key={s.id}
                            style={{
                                display: s.id === activeSession ? "block" : "none",
                                height: "100%"
                            }}
                        >
                            <TerminalView session={s} />
                        </div>
                    ))}
                </div>

            </div>

            {modalOpen && (
                <HostModal
                    host={editingHost}
                    hosts={hosts}
                    onClose={() => setModalOpen(false)}
                    onSave={saveHost}
                />
            )}
        </div>
        </>
    );
}