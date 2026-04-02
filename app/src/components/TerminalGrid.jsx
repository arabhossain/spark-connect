import React from "react";
import TerminalView from "./TerminalView";

export default function TerminalGrid({ sessions, visibleIds, activeId, layout, onSelect }) {

    const gridStyle = {
        display: layout === "single" ? "block" : "grid",
        gridTemplateColumns: layout === "split-h" ? `repeat(${visibleIds.length}, 1fr)` : "1fr",
        gridTemplateRows: layout === "split-v" ? `repeat(${visibleIds.length}, 1fr)` : "1fr",
        gap: "2px",
        background: "var(--border-subtle)",
        height: "100%",
        width: "100%",
        position: "relative"
    };

    return (
        <div className="terminal-grid" style={gridStyle}>
            {sessions.map(s => {
                const isVisible = layout === "single"
                    ? s.id === activeId
                    : visibleIds.includes(s.id);

                return (
                    <div
                        key={s.id}
                        className={`terminal-pane ${s.id === activeId ? "active" : ""}`}
                        onClick={() => onSelect(s.id)}
                        style={{
                            display: isVisible ? "block" : "none",
                            position: "relative",
                            overflow: "hidden",
                            height: "100%",
                            width: "100%",
                            background: "var(--background)",
                            border: s.id === activeId ? "2px solid var(--primary)" : "2px solid transparent",
                            transition: "border-color 0.2s ease"
                        }}
                    >
                        <TerminalView session={s} isVisible={isVisible} />
                    </div>
                );
            })}
        </div>
    );
}
