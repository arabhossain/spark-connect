import { motion } from "framer-motion";
import { FiTrash2, FiX, FiAlertTriangle } from "react-icons/fi";
import "../styles/modal.css";

export default function DeleteModal({ host, onClose, onConfirm }) {
    if (!host) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="modal-content glass-panel"
                style={{ width: "400px" }}
            >
                <div className="modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className="modal-icon-container" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                            <FiAlertTriangle size={20} />
                        </div>
                        <div className="modal-header-text">
                            <h2 className="modal-title">Delete Server?</h2>
                            <p className="modal-subtitle">This action cannot be undone</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <FiX size={20} />
                    </button>
                </div>

                <div className="modal-body" style={{ textAlign: "center", padding: "8px 24px 24px 24px" }}>
                    <div style={{
                        background: "rgba(239, 68, 68, 0.05)",
                        color: "#ef4444",
                        width: "64px",
                        height: "64px",
                        borderRadius: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px auto",
                        border: "1px solid rgba(239, 68, 68, 0.1)"
                    }}>
                        <FiTrash2 size={28} />
                    </div>

                    <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                        Are you sure you want to remove <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{host.name}</span>?<br />
                        The configuration for <code style={{ background: "rgba(255,255,255,0.05)", padding: "2px 4px", borderRadius: "4px" }}>{host.host}</code> will be permanently deleted.
                    </p>

                    <div className="modal-footer" style={{ marginTop: "32px", justifyContent: "stretch" }}>
                        <button
                            className="btn btn-cancel"
                            style={{ flex: 1, padding: "12px" }}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-save"
                            style={{
                                flex: 1,
                                padding: "12px",
                                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                border: "none",
                                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)"
                            }}
                            onClick={onConfirm}
                        >
                            Delete Host
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
