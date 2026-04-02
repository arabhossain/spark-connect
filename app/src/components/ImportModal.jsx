import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiFileText, FiFolder, FiCheck, FiAlertCircle, FiSettings, FiUser, FiHash, FiTag, FiKey } from "react-icons/fi";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "../styles/import-modal.css";

export default function ImportModal({ onClose, onImport, existingHosts }) {
    const [step, setStep] = useState(1); // 1: Source, 2: Preview/Selections
    const [discovered, setDiscovered] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const [loading, setLoading] = useState(false);

    const selectSource = async (type) => {
        console.log("selectSource called with type:", type);
        setLoading(true);
        try {
            let paths;
            if (type === "default") {
                const defaultPath = await invoke("get_default_ssh_config_path");
                console.log("Default path resolved to:", defaultPath);
                paths = [defaultPath];
            } else {
                console.log("Opening file picker...");
                const defaultDir = await invoke("get_ssh_dir");
                const selected = await open({
                    multiple: true,
                    directory: false,
                    title: "Select SSH Config Files",
                    defaultPath: defaultDir
                });
                console.log("File picker returned:", selected);
                if (!selected || (Array.isArray(selected) && selected.length === 0)) return;
                paths = Array.isArray(selected) ? selected : [selected];
            }

            console.log("Invoking read_ssh_config with paths:", paths);
            const hosts = await invoke("read_ssh_config", { paths });
            console.log("Discovery returned", hosts.length, "hosts");

            // Map hosts with status
            const mapped = hosts.map((h, index) => {
                const id = `discovered-${index}`;
                const hostname = h.hostname || h.host;
                const user = h.user || "root";

                const existing = existingHosts.find(eh => eh.host === hostname && (eh.user === user || !eh.user));

                let status = "new";
                let existingId = null;
                if (existing) {
                    existingId = existing.id;
                    // Check for conflicts (simplified check: port or identity file)
                    const portMatch = (h.port || 22) === (existing.port || 22);
                    if (!portMatch) {
                        status = "conflict";
                    } else {
                        status = "exists";
                    }
                }

                return {
                    ...h,
                    id,
                    existingId,
                    status,
                    selected: status !== "exists"
                };
            });

            setDiscovered(mapped);
            setSelectedIds(new Set(mapped.filter(m => m.selected).map(m => m.id)));
            setStep(2);
        } catch (err) {
            console.error("Discovery error:", err);
            alert("Failed to read SSH config: " + err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleImport = async () => {
        setLoading(true);
        const toImport = discovered.filter(h => selectedIds.has(h.id));
        const prepared = [];

        for (const h of toImport) {
            prepared.push({
                ...h,
                port: h.port || 22,
                user: h.user || "root",
                sshKey: null,
                // If it was a conflict/exists, it will be an update
                isUpdate: h.status === "conflict" || h.status === "exists"
            });
        }

        await onImport(prepared);
        setLoading(false);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="modal-content glass-panel"
                style={{ maxWidth: step === 1 ? "450px" : "800px", width: "90%" }}
            >
                <div className="modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className="modal-icon-container">
                            <FiFileText size={20} />
                        </div>
                        <div className="modal-header-text">
                            <h2 className="modal-title">Import SSH Hosts</h2>
                            <p className="modal-subtitle">
                                {step === 1 ? "Choose your SSH configuration source" : `Discovered ${discovered.length} hosts in config`}
                            </p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose} disabled={loading}>
                        <FiX size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {step === 1 ? (
                        <>
                            <div className="import-source-selection">
                                <button
                                    className="source-card glow-border"
                                    onClick={() => selectSource("default")}
                                    disabled={loading}
                                >
                                    <div className="source-icon"><FiSettings /></div>
                                    <div className="source-info">
                                        <div className="source-name">Default Config</div>
                                        <div className="source-path">~/.ssh/config</div>
                                    </div>
                                    <div className="source-arrow">→</div>
                                </button>

                                <button
                                    className="source-card glow-border"
                                    onClick={() => selectSource("custom")}
                                    disabled={loading}
                                >
                                    <div className="source-icon"><FiFileText /></div>
                                    <div className="source-info">
                                        <div className="source-name">File Manager</div>
                                        <div className="source-path">Select one or more config files</div>
                                    </div>
                                    <div className="source-arrow">→</div>
                                </button>

                                {loading && (
                                    <div style={{ textAlign: "center", marginTop: "20px", color: "var(--primary)" }}>
                                        Scanning...
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer" style={{ marginTop: "24px" }}>
                                <button className="btn btn-cancel" onClick={onClose} disabled={loading}>
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="import-preview-container">

                            <div className="discovered-list">
                                <table className="import-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: "40px" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.size === discovered.filter(d => d.status !== "exists").length}
                                                    onChange={() => {
                                                        const valid = discovered.filter(d => d.status !== "exists");
                                                        if (selectedIds.size === valid.length) setSelectedIds(new Set());
                                                        else setSelectedIds(new Set(valid.map(v => v.id)));
                                                    }}
                                                />
                                            </th>
                                            <th>Host Name</th>
                                            <th>Address</th>
                                            <th>User</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {discovered.map((h) => (
                                            <tr key={h.id} className={h.status === "exists" ? "row-exists" : ""}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(h.id)}
                                                        onChange={() => toggleSelect(h.id)}
                                                        disabled={h.status === "exists"}
                                                    />
                                                </td>
                                                <td><span className="h-name">{h.host}</span></td>
                                                <td><span className="h-addr">{h.hostname || "-"}</span></td>
                                                <td><span className="h-user">{h.user || "root"}</span></td>
                                                <td>
                                                    {h.status === "new" && <span className="badge badge-new">New</span>}
                                                    {h.status === "exists" && <span className="badge badge-exists">Already Integrated</span>}
                                                    {h.status === "conflict" && <span className="badge badge-conflict">Update Available</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="modal-footer" style={{ marginTop: "24px" }}>
                                <button className="btn btn-cancel" onClick={() => setStep(1)} disabled={loading}>
                                    Back
                                </button>
                                <button
                                    className="btn btn-save"
                                    onClick={handleImport}
                                    disabled={loading || selectedIds.size === 0}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? "Processing..." : `Import ${selectedIds.size} Selected`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
