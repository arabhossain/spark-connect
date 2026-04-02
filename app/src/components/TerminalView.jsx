import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "xterm/css/xterm.css";
import "../styles/terminal.css";
import { FiCopy, FiClipboard } from "react-icons/fi";

export default function TerminalView({ session, isVisible = true }) {
    const ref = useRef(null);
    const termInstance = useRef(null);
    const fitAddonRef = useRef(null);

    const [menu, setMenu] = useState(null);

    useEffect(() => {
        if (!session?.id) return;

        const term = new Terminal({
            cursorBlink: true,
            convertEol: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            theme: {
                background: "#0a0b10", // Match var(--bg-primary)
                foreground: "#f8fafc", // Match var(--text-primary)
                cursor: "#3b82f6",     // Match var(--primary)
                selection: "rgba(59, 130, 246, 0.3)",
                black: "#1e293b",
                red: "#ef4444",
                green: "#10b981",
                yellow: "#f59e0b",
                blue: "#3b82f6",
                magenta: "#8b5cf6",
                cyan: "#06b6d4",
                white: "#f8fafc",
            },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddonRef.current = fitAddon;

        term.open(ref.current);

        // Small delay to ensure the DOM is ready for measurement
        setTimeout(() => {
            if (ref.current && term.element) {
                try {
                    fitAddon.fit();
                } catch (e) {
                    console.warn("fitAddon.fit() failed during init:", e);
                }
            }
        }, 100);

        termInstance.current = term;

        // Listen to backend output
        const eventName = `ssh-output-${session.id}`;
        let unlistenFn;

        listen(eventName, (e) => {
            term.write(e.payload);
        }).then((unlisten) => {
            unlistenFn = unlisten;
        });

        // Send keyboard input to backend
        term.onData((data) => {
            invoke("ssh_write", {
                sessionId: session.id,
                input: data,
            });
        });

        // Use ResizeObserver for more robust resizing
        const resizeObserver = new ResizeObserver(() => {
            if (isVisible && term.element && ref.current) {
                try {
                    fitAddon.fit();
                    invoke("ssh_resize", {
                        sessionId: session.id,
                        rows: term.rows,
                        cols: term.cols,
                    }).catch(() => { });
                } catch (e) {
                    // Ignore transient resize errors
                }
            }
        });

        if (ref.current) {
            resizeObserver.observe(ref.current);
        }

        return () => {
            if (unlistenFn) unlistenFn();
            resizeObserver.disconnect();
            term.dispose();
        };
    }, [session.id]);

    // Force fit when visibility changes
    useEffect(() => {
        if (isVisible && termInstance.current && fitAddonRef.current) {
            setTimeout(() => {
                try {
                    fitAddonRef.current.fit();
                    termInstance.current.focus();
                    invoke("ssh_resize", {
                        sessionId: session.id,
                        rows: termInstance.current.rows,
                        cols: termInstance.current.cols,
                    }).catch(() => { });
                } catch (e) { }
            }, 50);
        }
    }, [isVisible]);

    // ---------------------------
    // Right Click Menu
    // ---------------------------
    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();

        setMenu({
            x: e.clientX,
            y: e.clientY,
        });
    };

    const closeMenu = () => setMenu(null);

    const handleCopy = async () => {
        const text = termInstance.current?.getSelection();

        if (text) {
            await navigator.clipboard.writeText(text);
        }

        closeMenu();
    };

    const handlePaste = async () => {
        const text = await navigator.clipboard.readText();

        if (text) {
            invoke("ssh_write", {
                sessionId: session.id,
                input: text,
            });
        }

        closeMenu();
    };

    // Close menu on outside click
    useEffect(() => {
        const handleClick = () => closeMenu();

        window.addEventListener("mousedown", handleClick);
        return () => window.removeEventListener("mousedown", handleClick);
    }, []);

    // ---------------------------
    // Middle Mouse Paste Support
    // ---------------------------
    const handleMouseDown = async (e) => {
        if (e.button === 1) {
            e.preventDefault();

            const text = await navigator.clipboard.readText();

            if (text) {
                invoke("ssh_write", {
                    sessionId: session.id,
                    input: text,
                });
            }
        }
    };

    return (
        <div
            className="terminal-container"
            onContextMenu={handleContextMenu}
            onMouseDown={handleMouseDown}
        >
            {/* Terminal */}
            <div
                ref={ref}
                style={{ width: "100%", height: "100%" }}
            />

            {/* Context Menu */}
            {menu && (
                <div
                    className="context-menu glass-panel"
                    style={{
                        top: menu.y,
                        left: menu.x,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="menu-item" onClick={handleCopy}>
                        <FiCopy size={14} /> Copy
                    </div>
                    <div className="menu-item" onClick={handlePaste}>
                        <FiClipboard size={14} /> Paste
                    </div>
                </div>
            )}
        </div>
    );
}