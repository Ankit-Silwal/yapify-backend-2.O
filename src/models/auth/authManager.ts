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
    const dbError = err as DatabaseError;
    if (dbError.code === '23505') { 
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
interface LoginRequestBody {
  email?: string;
  password?: string;
}

export const loginUser = async (req: Request<{}, {}, LoginRequestBody>, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide both the email and the password"
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // TODO: Generate JWT token here in the future
    
    return res.status(200).json({
      success: true,
      message: "Successfully logged in :)",
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Error logging in:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};