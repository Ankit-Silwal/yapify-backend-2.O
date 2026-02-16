import { Request, Response } from "express";
import pool from "../../config/db.js";

export const searchUsers = async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q) {
    return res.json([]);
  }

  try {
    const result = await pool.query(
      `
      SELECT id, username
      FROM users
      WHERE username ILIKE $1
      LIMIT 10
      `,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
