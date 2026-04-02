import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCopy, FiEdit3, FiArrowRight, FiArrowLeft, FiMinusCircle, FiTarget, FiZap } from "react-icons/fi";
import "../styles/tab-context.css";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from "@dnd-kit/core";

import {
    arrayMove,
    SortableContext,
    horizontalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

/* ================= CONTEXT MENU ================= */

function TabContextMenu({ x, y, session, onClose, actions }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="tab-context-menu"
            style={{ top: y, left: x }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="context-section">
                <div className="context-item" onClick={() => actions.duplicate(session.id)}>
                    <FiCopy size={14} />
                    <span className="context-label">Duplicate Tab</span>
                </div>
                <div className="context-item" onClick={() => actions.rename(session.id)}>
                    <FiEdit3 size={14} />
                    <span className="context-label">Rename Tab</span>
                </div>
            </div>

            <div className="context-section">
                <div className="context-item" onClick={() => actions.closeOthers(session.id)}>
                    <FiTarget size={14} />
                    <span className="context-label">Close Others</span>
                </div>
                <div className="context-item" onClick={() => actions.closeRight(session.id)}>
                    <FiArrowRight size={14} />
                    <span className="context-label">Close to the Right</span>
                </div>
                <div className="context-item" onClick={() => actions.closeLeft(session.id)}>
                    <FiArrowLeft size={14} />
                    <span className="context-label">Close to the Left</span>
                </div>
            </div>

            <div className="context-section">
                <div className="context-item danger" onClick={() => actions.closeAll()}>
                    <FiMinusCircle size={14} />
                    <span className="context-label">Close All Tabs</span>
                </div>
            </div>

            <div className="context-section">
                <div className="color-options">
                    {["#00ff88", "#ff4d4f", "#1890ff", "#722ed1", "#fa8c16"].map(color => (
                        <div
                            key={color}
                            className="color-circle"
                            style={{ background: color }}
                            onClick={() => actions.setColor(session.id, color)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ================= TAB ITEM ================= */

function TabItem({ session, activeSession, onSelect, onClose, onContextMenu }) {

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: session.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        borderBottom: session.color ? `2px solid ${session.color}` : "none"
    };

    const isActive = session.id === activeSession;

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`tab-item ${isActive ? "active" : ""}`}
            onContextMenu={(e) => onContextMenu(e, session)}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
        >
            {/* Drag handle (only this triggers drag) */}
            <span {...listeners} className="drag-handle">⋮⋮</span>

            {/* Status dot */}
            {session.reconnecting ? (
                <span className="spinner" />
            ) : (
                <span
                    className="status-dot"
                    style={{
                        background: session.color || (session.connected ? "#00ff88" : "#ff4d4f")
                    }}
                />
            )}

            {/* Label */}
            <span
                className="tab-label"
                onClick={() => onSelect(session.id)}
                title={session.host.name}
            >
                {session.title || session.host.name}
            </span>

            {/* Close */}
            <span
                className="close-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(session.id);
                }}
            >
                <FiX size={14} />
            </span>
        </motion.div>
    );
}

/* ================= MAIN TABS ================= */

export default function Tabs({
    sessions,
    setSessions,
    activeSession,
    onSelect,
    onClose,
    actions // NEW: batch actions from App.jsx
}) {

    const [activeDragId, setActiveDragId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5 // prevents accidental drag on click
            }
        })
    );

    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
    };

    const handleDragEnd = ({ active, over }) => {
        setActiveDragId(null);

        if (!over) return;

        if (active.id !== over.id) {
            const oldIndex = sessions.findIndex(s => s.id === active.id);
            const newIndex = sessions.findIndex(s => s.id === over.id);

            setSessions(arrayMove(sessions, oldIndex, newIndex));
        }
    };

    const handleContextMenu = (e, session) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            session
        });
    };

    const activeDragItem = sessions.find(s => s.id === activeDragId);

    // Context Menu Handlers
    const menuActions = {
        closeAll: () => { actions.closeAll(); setContextMenu(null); },
        closeOthers: (id) => { actions.closeOthers(id); setContextMenu(null); },
        closeRight: (id) => { actions.closeRight(id); setContextMenu(null); },
        closeLeft: (id) => { actions.closeLeft(id); setContextMenu(null); },
        duplicate: (id) => { actions.duplicate(id); setContextMenu(null); },
        rename: (id) => {
            const name = prompt("Enter new tab name:");
            if (name) actions.rename(id, name);
            setContextMenu(null);
        },
        setColor: (id, color) => {
            actions.setColor(id, color);
            setContextMenu(null);
        }
    };

    return (
        <div className="tab-wrapper" onContextMenu={(e) => e.preventDefault()}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={sessions.map(s => s.id)}
                    strategy={horizontalListSortingStrategy}
                >
                    <div className="tab-bar">
                        <AnimatePresence>
                            {sessions.map(s => (
                                <TabItem
                                    key={s.id}
                                    session={s}
                                    activeSession={activeSession}
                                    onSelect={onSelect}
                                    onClose={onClose}
                                    onContextMenu={handleContextMenu}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </SortableContext>

                {/* Drag Preview (FIXED to cursor) */}
                <DragOverlay
                    dropAnimation={null}
                >
                    {activeDragItem ? (
                        <div className="drag-preview">
                            {activeDragItem.host.name}
                        </div>
                    ) : null}
                </DragOverlay>

            </DndContext>

            <AnimatePresence>
                {contextMenu && (
                    <TabContextMenu
                        {...contextMenu}
                        onClose={() => setContextMenu(null)}
                        actions={menuActions}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}