import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../../config/db.js';
import { checkStrongPassword } from '../../utils/strongpassword.js';

interface RegisterRequestBody {
  userName?: string;
  email?: string;
  password?: string;
  conformPassword?: string;
}

interface DatabaseError extends Error {
  code?: string;
}

export const registerUsers = async (req: Request<{}, {}, RegisterRequestBody>, res: Response): Promise<Response> => {
  const { userName, email, password, conformPassword } = req.body;

  if (!userName || !email || !password || !conformPassword) {
    return res.status(400).json({
      success: false,
      message: "Please provide all the required credentials: userName, email, password, conformPassword"
    });
  }
  
  // Type narrowing: TypeScript now knows these strings are defined
  if (password !== conformPassword) {
    return res.status(400).json({
      success: false,
      message: "The passwords didn't match with each other"
    });
  }

  const passwordCheck = checkStrongPassword(password);
  if (!passwordCheck.isStrong) {
    return res.status(400).json({
      success: false,
      message: passwordCheck.errors.join(", ")
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, username
      `,
      [userName, email, hashedPassword]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.error("Error registering user:", err);
    
    // Safely checking error code
    const dbError = err as DatabaseError;
    if (dbError.code === '23505') { // Unique violation error code for Postgres
      return res.status(409).json({
        success: false,
        message: "Email or Username already exists"
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
