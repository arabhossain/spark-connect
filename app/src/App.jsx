import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import HostModal from "./components/HostModal";
import ImportModal from "./components/ImportModal";
import DeleteModal from "./components/DeleteModal";
import Dashboard from "./components/Dashboard";
import CommandPalette from "./components/CommandPalette";
import TerminalView from "./components/TerminalView";
import TerminalGrid from "./components/TerminalGrid";
import Tabs from "./components/Tabs";
import { FiTrash2, FiPlus, FiTerminal, FiEdit2, FiSearch, FiLogOut, FiSlash } from "react-icons/fi";
import { VscSplitHorizontal, VscSplitVertical, VscLayoutCentered } from "react-icons/vsc";
import { invoke } from "@tauri-apps/api/core";
import logoImg from "./assets/logo.png";
import { Toaster, toast } from "react-hot-toast";

import "./styles/global.css";
import "./styles/tabs.css";
import "./styles/login.css";

const API = "https://sparkconnect.codesparks.me";

export default function App() {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [mode, setMode] = useState("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const [hosts, setHosts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [editingHost, setEditingHost] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [visibleSessions, setVisibleSessions] = useState([]);
    const [layout, setLayout] = useState("single");
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [paletteOpen, setPaletteOpen] = useState(false);

    useEffect(() => {
        const handleKeys = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener("keydown", handleKeys);
        return () => window.removeEventListener("keydown", handleKeys);
    }, []);

    const notify = {
        success: (msg) => toast.success(msg),
        error: (msg) => toast.error(msg),
        loading: (msg) => toast.loading(msg),
        dismiss: (id) => toast.dismiss(id)
    };

    const startResizing = (e) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 280) newWidth = 280;
            if (newWidth > 600) newWidth = 600;
            setSidebarWidth(newWidth);
        };
        const stopResizing = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", stopResizing);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing]);

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        document.addEventListener("contextmenu", disableRightClick);
        return () => document.removeEventListener("contextmenu", disableRightClick);
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem("sessions");
        if (saved) {
            const parsed = JSON.parse(saved);
            setSessions(parsed);
            if (parsed.length > 0) {
                setActiveSession(parsed[0].id);
                setVisibleSessions([parsed[0].id]);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("sessions", JSON.stringify(sessions));
    }, [sessions]);

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
        const newSession = { id, host, connected: false, reconnecting: true };
        setSessions(prev => [...prev, newSession]);
        setActiveSession(id);
        setVisibleSessions(prev => {
            if (layout === "single") return [id];
            if (prev.length >= 2) return [prev[1], id];
            return [...prev, id];
        });
        try {
            await invoke("ssh_connect", {
                sessionId: id,
                host: host.host,
                user: host.user,
                password: host.password || null,
                privateKey: host.sshKey || null,
                passphrase: host.passphrase || null,
                jumpHost: buildJumpHost(host),
                options: {
                    strictHostChecking: false,
                    useKnownHosts: false,
                    allowRsa: true,
                    useAgent: host.authType === "agent",
                    identityFile: host.identityFile,
                    identitiesOnly: host.identitiesOnly,
                    proxyCommand: host.proxyCommand
                }
            });
            notify.dismiss(loadingToast);
            notify.success(`Connected to ${host.host}`);
            setSessions(prev => prev.map(s => s.id === id ? { ...s, connected: true, reconnecting: false } : s));

            fetch(API + "/telemetry/session", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ hostId: host.id, status: 'active' })
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.id) {
                    setSessions(prev => prev.map(s => s.id === id ? { ...s, serverId: data.id } : s));
                }
            })
            .catch(e => console.error("Telemetry session error", e));
        } catch (err) {
            notify.dismiss(loadingToast);
            notify.error(`Failed to connect: ${host.host}`);
            setSessions(prev => prev.map(s => s.id === id ? { ...s, connected: false, reconnecting: false } : s));
        }
    };

    const closeSession = async (sessionId) => {
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            fetch(API + "/telemetry/session", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ hostId: session.host.id, status: 'inactive' })
            }).catch(e => console.error("Telemetry close error", e));
        }

        try {
            await invoke("ssh_disconnect", { sessionId });
        } catch { }
        setSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId);
            if (activeSession === sessionId) setActiveSession(updated[0]?.id || null);
            return updated;
        });
    };

    const selectSession = (id) => {
        setActiveSession(id);
        if (layout === "single") {
            setVisibleSessions([id]);
        }
    };

    const toggleSplit = (type) => {
        if (sessions.length < 2) {
            notify.error("Connect to at least 2 servers to use split view");
            return;
        }

        if (layout === type) {
            setLayout("single");
            setVisibleSessions([activeSession]);
        } else {
            setLayout(type);
            // If we only have 1 visible session, try to find another one to show
            if (visibleSessions.length < 2) {
                const other = sessions.find(s => s.id !== activeSession);
                if (other) {
                    setVisibleSessions([activeSession, other.id]);
                }
            }
        }
    };

    const closeHostSessions = (hostId) => {
        const toClose = sessions.filter(s => s.host.id === hostId);
        toClose.forEach(s => {
            fetch(API + "/telemetry/session", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ hostId: s.host.id, status: 'inactive' })
            }).catch(() => {});
            invoke("ssh_disconnect", { sessionId: s.id });
        });
        setSessions(prev => {
            const updated = prev.filter(s => s.host.id !== hostId);
            if (!updated.find(s => s.id === activeSession)) setActiveSession(updated[0]?.id || null);
            return updated;
        });
        notify.success("Closed all host sessions");
    };

    const tabActions = {
        closeAll: () => {
            sessions.forEach(s => {
                fetch(API + "/telemetry/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                    body: JSON.stringify({ hostId: s.host.id, status: 'inactive' })
                }).catch(() => {});
                invoke("ssh_disconnect", { sessionId: s.id });
            });
            setSessions([]);
            setActiveSession(null);
        },
        closeOthers: (id) => {
            const others = sessions.filter(s => s.id !== id);
            others.forEach(s => {
                fetch(API + "/telemetry/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                    body: JSON.stringify({ hostId: s.host.id, status: 'inactive' })
                }).catch(() => {});
                invoke("ssh_disconnect", { sessionId: s.id });
            });
            setSessions(sessions.filter(s => s.id === id));
            setActiveSession(id);
        },
        closeRight: (id) => {
            const idx = sessions.findIndex(s => s.id === id);
            const toClose = sessions.slice(idx + 1);
            toClose.forEach(s => {
                fetch(API + "/telemetry/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                    body: JSON.stringify({ hostId: s.host.id, status: 'inactive' })
                }).catch(() => {});
                invoke("ssh_disconnect", { sessionId: s.id });
            });
            const remaining = sessions.slice(0, idx + 1);
            setSessions(remaining);
            if (!remaining.find(s => s.id === activeSession)) setActiveSession(id);
        },
        closeLeft: (id) => {
            const idx = sessions.findIndex(s => s.id === id);
            const toClose = sessions.slice(0, idx);
            toClose.forEach(s => {
                fetch(API + "/telemetry/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                    body: JSON.stringify({ hostId: s.host.id, status: 'inactive' })
                }).catch(() => {});
                invoke("ssh_disconnect", { sessionId: s.id });
            });
            const remaining = sessions.slice(idx);
            setSessions(remaining);
            if (!remaining.find(s => s.id === activeSession)) setActiveSession(id);
        },
        duplicate: (id) => {
            const session = sessions.find(s => s.id === id);
            if (session) openSession(session.host);
        },
        rename: (id, name) => setSessions(prev => prev.map(s => s.id === id ? { ...s, title: name } : s)),
        setColor: (id, color) => setSessions(prev => prev.map(s => s.id === id ? { ...s, color } : s))
    };

    const handleAuth = async () => {
        const loadingToast = notify.loading(mode === "login" ? "Logging in..." : "Registering...");
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
        } catch {
            notify.dismiss(loadingToast);
            notify.error("Authentication failed");
        }
    };

    const logout = () => {
        localStorage.clear();
        setToken(null);
        setSessions([]);
        setActiveSession(null);
    };

    const fetchHosts = async () => {
        try {
            const res = await fetch(API + "/hosts", { headers: { Authorization: "Bearer " + token } });
            if (!res.ok) throw new Error("Failed to fetch hosts");
            const data = await res.json();
            setHosts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("fetchHosts error:", err);
            setHosts([]);
        }
    };

    const fetchGroups = async () => {
        try {
            const res = await fetch(API + "/groups", { headers: { Authorization: "Bearer " + token } });
            if (!res.ok) throw new Error("Failed to fetch groups");
            const data = await res.json();
            console.log("Groups from API:", data);
            setGroups(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("fetchGroups error:", err);
            setGroups([]);
        }
    };

    useEffect(() => {
        if (token) {
            fetchHosts().catch(() => { });
            fetchGroups().catch(() => { });
        }
    }, [token]);

    const saveHost = async (host) => {
        const loadingToast = notify.loading("Saving host...");
        try {
            const url = editingHost ? `${API}/hosts/${editingHost.id}` : `${API}/hosts`;
            const res = await fetch(url, {
                method: editingHost ? "PUT" : "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify(host),
            });
            if (!res.ok) throw new Error("Save failed");
            notify.dismiss(loadingToast);
            notify.success("Host saved");
            setModalOpen(false);
            setEditingHost(null);
            fetchHosts();
        } catch (err) {
            notify.dismiss(loadingToast);
            notify.error("Failed to save host");
        }
    };

    const moveHostToGroup = async (hostId, newGroup) => {
        const host = hosts.find(h => h.id === hostId);
        if (!host) return;

        const loadingToast = notify.loading(`Moving ${host.name} to ${newGroup || 'Ungrouped'}...`);
        try {
            const url = `${API}/hosts/${hostId}`;
            await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ ...host, group: newGroup })
            });
            notify.dismiss(loadingToast);
            notify.success(`Moved to ${newGroup || 'Ungrouped'}`);
            fetchHosts();
        } catch {
            notify.dismiss(loadingToast);
            notify.error("Failed to move host");
        }
    };

    const createGroup = async (name) => {
        const loading = notify.loading(`Creating group ${name}...`);
        try {
            const res = await fetch(API + "/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ name })
            });
            const newGroup = await res.json();
            setGroups(prev => [...prev, newGroup]);
            notify.dismiss(loading);
            notify.success("Group created");
        } catch {
            notify.dismiss(loading);
            notify.error("Failed to create group");
        }
    };

    const deleteGroup = async (groupId) => {
        const loading = notify.loading("Deleting group...");
        try {
            await fetch(`${API}/groups/${groupId}`, {
                method: "DELETE",
                headers: { Authorization: "Bearer " + token }
            });
            setGroups(prev => prev.filter(g => g.id !== groupId));
            notify.dismiss(loading);
            notify.success("Group deleted");
        } catch {
            notify.dismiss(loading);
            notify.error("Failed to delete group");
        }
    };

    const handleImportHosts = async (preparedHosts) => {
        const loading = notify.loading(`Importing ${preparedHosts.length} hosts...`);
        try {
            for (const h of preparedHosts) {
                const url = h.isUpdate ? `${API}/hosts/${h.existingId}` : `${API}/hosts`;
                const body = {
                    name: h.host, host: h.hostname || h.host, port: h.port || 22, user: h.user || "root",
                    authType: h.sshKey ? "sshKey" : (h.identity_file ? "sshKey" : "agent"),
                    sshKey: h.sshKey || null, passphrase: null, useAgent: !h.sshKey && !h.identity_file,
                    identityFile: h.sshKey ? null : (h.identity_file || null),
                    identitiesOnly: h.identities_only || false, proxyCommand: h.proxy_command || null,
                    proxyJump: h.proxy_jump || null, group: h.group || null
                };
                await fetch(url, {
                    method: h.isUpdate ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                    body: JSON.stringify(body),
                });
            }
            notify.dismiss(loading);
            notify.success("Import complete");
            fetchHosts();
        } catch {
            notify.dismiss(loading);
            notify.error("Import failed");
        }
    };

    const deleteHost = (host) => setConfirmDelete(host);
    const confirmDeleteAction = async () => {
        const host = confirmDelete;
        if (!host) return;
        setConfirmDelete(null);
        const loading = notify.loading(`Deleting ${host.name}...`);
        try {
            await fetch(`${API}/hosts/${host.id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
            notify.dismiss(loading);
            notify.success("Host deleted");
            fetchHosts();
        } catch {
            notify.dismiss(loading);
            notify.error("Delete failed");
        }
    };

    if (!token) {
        return (
            <div className="login-container">
                <div className="background-blur blur-1"></div>
                <div className="background-blur blur-2"></div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="login-card glass-panel">
                    <div className="login-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <img src={logoImg} alt="Sparks Connect Logo" style={{ width: '64px', height: '64px', borderRadius: '12px' }} />
                        <div className="login-logo">Sparks Connect</div>
                    </div>
                    <div className="login-form">
                        <div className="form-group"><label>Username</label><input value={username} onChange={e => setUsername(e.target.value)} /></div>
                        <div className="form-group"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
                        <button className="btn auth-btn" onClick={handleAuth}>{mode === "login" ? "Sign In" : "Register"}</button>
                        <button className="btn switch-btn" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "New? Register" : "Login"}</button>
                    </div>
                </motion.div>
                <Toaster position="bottom-center" />
            </div>
        );
    }

    const handleRefresh = async () => {
        const loading = toast.loading("Refreshing workspace...");
        try {
            await Promise.all([fetchHosts(), fetchGroups()]);
            toast.dismiss(loading);
            toast.success("Workspace updated");
        } catch {
            toast.dismiss(loading);
            toast.error("Refresh failed");
        }
    };

    return (
        <div className="app-container">
            <Toaster position="top-right" />
            <Sidebar
                width={sidebarWidth} hosts={hosts} sessions={sessions} onConnect={openSession}
                onAdd={() => { setEditingHost(null); setModalOpen(true); }}
                onEdit={(h) => { setEditingHost(h); setModalOpen(true); }}
                onLogout={logout} importSSH={() => setImportOpen(true)} onDelete={deleteHost}
                onStopHostSessions={closeHostSessions}
                onMoveHost={moveHostToGroup}
                groups={groups}
                onCreateGroup={createGroup}
                onDeleteGroup={deleteGroup}
                onRefresh={handleRefresh}
            />
            <div className="resize-handle" onMouseDown={startResizing} />
            <main className="main-content">
                <Tabs sessions={sessions} setSessions={setSessions} activeSession={activeSession} onSelect={selectSession} onClose={closeSession} actions={tabActions} />
                <div className="terminal-container">
                    {sessions.length > 0 && (
                        <div className="terminal-actions">
                            <button className={`icon-btn ${layout === "split-v" ? "active" : ""}`} title="Split Vertical" onClick={() => toggleSplit("split-v")}>
                                <VscSplitVertical size={16} />
                            </button>
                            <button className={`icon-btn ${layout === "split-h" ? "active" : ""}`} title="Split Horizontal" onClick={() => toggleSplit("split-h")}>
                                <VscSplitHorizontal size={16} />
                            </button>
                            <button className={`icon-btn ${layout === "single" ? "active" : ""}`} title="Single View" onClick={() => setLayout("single")}>
                                <VscLayoutCentered size={16} />
                            </button>
                            {layout !== "single" && (
                                <button className="icon-btn danger" title="Clear Split" onClick={() => { setLayout("single"); setVisibleSessions([activeSession]); }}>
                                    <FiSlash size={16} />
                                </button>
                            )}
                        </div>
                    )}
                    {sessions.length === 0 ? (
                        <Dashboard hosts={hosts} onAdd={() => setModalOpen(true)} onConnect={openSession} />
                    ) : (
                        <TerminalGrid
                            sessions={sessions}
                            visibleIds={visibleSessions}
                            activeId={activeSession}
                            layout={layout}
                            onSelect={setActiveSession}
                        />
                    )}
                </div>
            </main>
            {modalOpen && <HostModal host={editingHost} hosts={hosts} groups={groups} onClose={() => setModalOpen(false)} onSave={saveHost} />}
            {importOpen && <ImportModal existingHosts={hosts} onClose={() => setImportOpen(false)} onImport={handleImportHosts} />}
            <AnimatePresence>
                {confirmDelete && <DeleteModal host={confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={confirmDeleteAction} />}
            </AnimatePresence>
            <CommandPalette
                isOpen={paletteOpen}
                onClose={() => setPaletteOpen(false)}
                hosts={hosts}
                onConnect={openSession}
                onAdd={() => setModalOpen(true)}
                onLogout={logout}
            />
        </div>
    );
}