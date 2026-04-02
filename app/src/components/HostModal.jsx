import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FiServer, FiX } from "react-icons/fi";
import "../styles/modal.css";

export default function HostModal({ host, hosts = [], onClose, onSave }) {
    const [form, setForm] = useState({
        name: "",
        host: "",
        port: 22,
        user: "",
        authType: "password",
        password: "",
        sshKey: "",
        identityFile: "",
        passphrase: "",
        useAgent: false,
        identitiesOnly: false,
        jumpHostId: "",
        proxyCommand: ""
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [isJumpOpen, setIsJumpOpen] = useState(false);
    const jumpRef = useRef(null);

    useEffect(() => {
        if (host) {
            setForm(prev => ({
                ...prev,
                ...host
            }));
        }
    }, [host]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (jumpRef.current && !jumpRef.current.contains(e.target)) {
                setIsJumpOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter out the current host and search by name/ip
    const filteredHosts = hosts.filter(h => {
        if (host && h.id === host.id) return false;
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return h.name.toLowerCase().includes(search) || h.host.toLowerCase().includes(search);
    });

    const selectedJumpHost = hosts.find(h => h.id === form.jumpHostId);

    const update = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const toggleKeyMode = () => {
        update("sshKey", "");
        update("identityFile", "");
    };

    return (
        <div className="modal-overlay">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="modal-content glass-panel"
            >
                <div className="modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className="modal-icon-container">
                            <FiServer size={20} />
                        </div>
                        <div className="modal-header-text">
                            <h2 className="modal-title">{host ? "Edit Server Connection" : "Add New Server"}</h2>
                            <p className="modal-subtitle">Configure your remote connection parameters</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <FiX size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* ================= BASIC ================= */}
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            value={form.name}
                            onChange={e => update("name", e.target.value)}
                            placeholder="My Production Server"
                        />
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                        <div className="form-group" style={{ flex: 3 }}>
                            <label>Host</label>
                            <input
                                value={form.host}
                                onChange={e => update("host", e.target.value)}
                                placeholder="192.168.1.1 or example.com"
                            />
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Port</label>
                            <input
                                type="number"
                                value={form.port}
                                onChange={e => update("port", Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>User</label>
                        <input
                            value={form.user}
                            onChange={e => update("user", e.target.value)}
                            placeholder="root"
                        />
                    </div>

                    {/* ================= AUTH ================= */}
                    <div className="auth-section">
                        <h4>Authentication</h4>

                        <select
                            value={form.authType}
                            onChange={e => update("authType", e.target.value)}
                        >
                            <option value="password">Password</option>
                            <option value="sshKey">SSH Key</option>
                            <option value="agent">SSH Agent</option>
                        </select>

                        {/* PASSWORD */}
                        {form.authType === "password" && (
                            <input
                                type="password"
                                placeholder="Password"
                                value={form.password}
                                onChange={e => update("password", e.target.value)}
                            />
                        )}

                        {/* SSH KEY */}
                        {form.authType === "sshKey" && (
                            <>
                                <div className="form-group">
                                    <label>Key Mode</label>
                                    <select
                                        value={form.identityFile ? "file" : "inline"}
                                        onChange={toggleKeyMode}
                                    >
                                        <option value="inline">Paste Key</option>
                                        <option value="file">Use File Path</option>
                                    </select>
                                </div>

                                {!form.identityFile && (
                                    <textarea
                                        placeholder="Paste private key..."
                                        value={form.sshKey}
                                        onChange={e => update("sshKey", e.target.value)}
                                        rows={4}
                                    />
                                )}

                                {form.identityFile !== "" && (
                                    <input
                                        placeholder="~/.ssh/id_rsa"
                                        value={form.identityFile}
                                        onChange={e => update("identityFile", e.target.value)}
                                    />
                                )}

                                <input
                                    type="password"
                                    placeholder="Passphrase (optional)"
                                    value={form.passphrase}
                                    onChange={e => update("passphrase", e.target.value)}
                                />

                                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={form.identitiesOnly}
                                        onChange={e => update("identitiesOnly", e.target.checked)}
                                    />
                                    IdentitiesOnly
                                </label>
                            </>
                        )}

                        {/* AGENT */}
                        {form.authType === "agent" && (
                            <p style={{ fontSize: 13, opacity: 0.7 }}>
                                Will use system SSH agent (~/.ssh + ssh-agent)
                            </p>
                        )}
                    </div>

                    {/* ================= PROXY ================= */}
                    <div className="jump-section">
                        <h4>Proxy / Jump Host</h4>

                        <div className="searchable-select-container" ref={jumpRef}>
                            <div
                                className={`searchable-select-trigger ${isJumpOpen ? 'active' : ''}`}
                                onClick={() => setIsJumpOpen(!isJumpOpen)}
                            >
                                <div className="selected-value">
                                    {selectedJumpHost ? `${selectedJumpHost.name} (${selectedJumpHost.host})` : "Direct (No Proxy)"}
                                </div>
                                <div className={`arrow ${isJumpOpen ? 'up' : 'down'}`}>▾</div>
                            </div>

                            {isJumpOpen && (
                                <div className="searchable-select-dropdown glass-panel">
                                    <input
                                        autoFocus
                                        className="search-input-mini"
                                        placeholder="Search jump hosts..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="options-list">
                                        {!searchTerm && (
                                            <div
                                                className={`option-item ${!form.jumpHostId ? 'selected' : ''}`}
                                                onClick={() => {
                                                    update("jumpHostId", "");
                                                    setIsJumpOpen(false);
                                                    setSearchTerm("");
                                                }}
                                            >
                                                Direct (No Proxy)
                                            </div>
                                        )}
                                        {filteredHosts.map(h => (
                                            <div
                                                key={h.id}
                                                className={`option-item ${form.jumpHostId === h.id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    update("jumpHostId", h.id);
                                                    setIsJumpOpen(false);
                                                    setSearchTerm("");
                                                }}
                                            >
                                                <div className="option-name">{h.name}</div>
                                                <div className="option-details">{h.host}</div>
                                            </div>
                                        ))}
                                        {filteredHosts.length === 0 && (
                                            <div className="no-options">No hosts found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Or Custom ProxyCommand</label>
                            <input
                                placeholder="ssh -W %h:%p jump-host"
                                value={form.proxyCommand}
                                onChange={e => update("proxyCommand", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* ================= ACTIONS ================= */}
                    <div className="modal-footer">
                        <button onClick={onClose} className="btn btn-cancel">
                            Cancel
                        </button>

                        <button
                            onClick={() => onSave(form)}
                            className="btn btn-save"
                        >
                            {host ? "Save Changes" : "Create"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}