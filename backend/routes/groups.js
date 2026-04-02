const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET ALL GROUPS
 */
router.get("/", auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const [groups] = await db.query(
            "SELECT * FROM user_groups WHERE ownerId = ?",
            [userId]
        );

        res.json(groups);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch groups" });
    }
});

/**
 * CREATE GROUP
 */
router.post("/", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Group name is required" });
        }

        const id = crypto.randomUUID();

        await db.query(
            "INSERT INTO user_groups (id, name, ownerId) VALUES (?, ?, ?)",
            [id, name, userId]
        );

        res.status(201).json({
            id,
            name,
            ownerId: userId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create group" });
    }
});

/**
 * DELETE GROUP
 */
router.delete("/:id", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Optional safety: ensure user owns the group
        const [result] = await db.query(
            "DELETE FROM user_groups WHERE id = ? AND ownerId = ?",
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Group not found or unauthorized" });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete group" });
    }
});

module.exports = router;