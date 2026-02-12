import type { Request, Response, NextFunction } from "express";
import REDIS_CLIENT, { isRedisConnected } from "../config/redis.js";
import { getInMemorySession, hasInMemorySession } from "../models/auth/sessionManager.js";

export async function checkSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: No session found"
    });
    return;
  }

  try {
    let sessionData: any = null;

    if (isRedisConnected()) {
      const sessionKey = `session:${sessionId}`;
      const data = await REDIS_CLIENT.get(sessionKey);
      if (data) {
        sessionData = JSON.parse(data);
      }
    } else if (hasInMemorySession(sessionId)) {
      // Use in-memory fallback
      sessionData = getInMemorySession(sessionId);
    }

    if (!sessionData) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid or expired session"
      });
      return;
    }

    // Attach userId to request
    req.userId = sessionData.userId;
    next();
  } catch (error: any) {
    console.error("Error in checkSession middleware:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}
