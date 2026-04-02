import { useState } from "react";
import { FiSearch, FiPlus, FiTrash2, FiEdit2, FiTerminal, FiKey, FiUser, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/sidebar.css";

export default function Sidebar({
    width = 280,
    hosts,
    sessions = [],
    onConnect,
    onAdd,
    onEdit,
    onDelete,
    onLogout,
    importSSH,
    onStopHostSessions // NEW PROP
}) {
    const [search, setSearch] = useState("");
    const username = localStorage.getItem("username");

    const filtered = hosts.filter(h =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.host.includes(search)
    );

    // Get count of active sessions for this host
    const getSessionCount = (hostId) => {
        return sessions.filter(s => s.host.id === hostId).length;
    };

    // Check if a host has an active, connected session
    const getStatus = (host) => {
        const session = sessions.find(s => s.host.id === host.id);
        if (!session) return "offline";
        return session.connected ? "connected" : "error";
    };

    return (
        <div className="sidebar-container glass-panel" style={{ width: width }}>
            {/* ... header ... */}
            <div className="sidebar-header">
                <h3>Hosts</h3>

                <div className="search-container">
                    <FiSearch size={14} color="var(--text-muted)" />
                    <input
                        placeholder="Search servers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="sidebar-actions">
                    <button onClick={onAdd} className="sidebar-btn primary-btn">
                        <FiPlus size={16} /> New Host
                    </button>

                    <button onClick={importSSH} className="sidebar-btn secondary-btn">
                        <FiKey size={16} /> Import
                    </button>
                </div>
            </div>

            <div className="host-list">
                <AnimatePresence>
                    {filtered.map((h, index) => {
                        const status = getStatus(h);
                        const count = getSessionCount(h.id);

                        return (
                            <motion.div
                                key={h.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                className="host-card glow-border"
                                onDoubleClick={() => onConnect(h)}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                                    <div style={{ color: "var(--primary)", opacity: 0.8, display: "flex" }}>
                                        <FiTerminal size={20} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div className="host-name">{h.name}</div>
                                            <div className={`status-dot-indicator ${status}`} title={status}></div>

                                            {count > 0 && (
                                                <span className="session-count-badge">
                                                    {count} {count === 1 ? 'tab' : 'tabs'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="host-details">{h.user}@{h.host}</div>
                                    </div>

                                    {count > 0 && (
                                        <button
                                            className="close-all-host-btn"
                                            title={`Close all ${h.name} sessions`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onStopHostSessions(h.id);
                                            }}
                                        >
                                            <FiX size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="card-actions">
                                    <button className="icon-btn" title="Connect" onClick={(e) => { e.stopPropagation(); onConnect(h); }}>
                                        <FiTerminal size={14} />
                                    </button>

                                    <button className="icon-btn" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(h); }}>
                                        <FiEdit2 size={14} />
                                    </button>

                                    <button className="icon-btn danger" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(h); }}>
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* FOOTER */}
            <div className="sidebar-footer">
                <div className="user-info">
                    <FiUser size={16} />
                    <span>{username}</span>
                </div>

                <button onClick={onLogout} className="logout-btn">
                    Logout
                </button>
            </div>
        </div>
    );
}