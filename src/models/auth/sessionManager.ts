import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import REDIS_CLIENT, { isRedisConnected } from "../../config/redis.js";


const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds


const inMemorySessions = new Map<string, any>();
const userSessions = new Map<string, Set<string>>();

export function getInMemorySession(sessionId: string): any {
  return inMemorySessions.get(sessionId);
}

export function hasInMemorySession(sessionId: string): boolean {
  return inMemorySessions.has(sessionId);
}

export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}
export async function createSession(
  userId: string | number,
  req: Request
): Promise<string> {
  const sessionId = generateSessionId();
  const sessionData = {
    userId: userId.toString(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL * 1000).toISOString(),
    ip: req.ip ?? "unknown",
    userAgent: req.get("user-agent") ?? "unknown"
  };
  
  if (isRedisConnected()) {
    try {
      // Store session data with expiry
      await REDIS_CLIENT.setEx(
        `session:${sessionId}`, 
        SESSION_TTL, 
        JSON.stringify(sessionData)
      );
      
      // Add to user's session list
      await REDIS_CLIENT.sAdd(`user_sessions:${userId}`, sessionId);
      
      console.log(`Session created in Redis for ${userId}`);
    } catch (error) {
       console.error("Redis error creating session:", error);
       // Fallback to in-memory locally if Redis fails?
       // For now, let's keep the local fallback below as well to be safe or just use it if !isRedisConnected
    }
  }

  // Always keep in-memory as backup or if Redis is down
  if (!isRedisConnected()) {
      inMemorySessions.set(sessionId, sessionData);
      const userKey = userId.toString();
      if (!userSessions.has(userKey)) {
        userSessions.set(userKey, new Set());
      }
      userSessions.get(userKey)!.add(sessionId);
      
      // Auto-expire in-memory session
      setTimeout(() => {
        inMemorySessions.delete(sessionId);
        userSessions.get(userKey)?.delete(sessionId);
      }, SESSION_TTL * 1000);
      console.log(`Session created in-memory for ${userId}`);
  }
  
  return sessionId;
}

type json = {
  success:boolean,
  message:string
}
type SessionInfo = {
  sessionId: string,
  userId: string,
  ip: string,
  userAgent: string,
  createdAt: string,
  expiresAt: string
}
export async function deleteSession(
  userId: string | number,
  req: Request,
  res: Response
): Promise<json> {
  const sessionId = req.cookies.sessionId;
  
  if (isRedisConnected()) {
    try {
        const deleted = await REDIS_CLIENT.del(`session:${sessionId}`);
        if (deleted > 0) {
            await REDIS_CLIENT.sRem(`user_sessions:${userId}`, sessionId);
            return {
                success: true,
                message: `Session for ${userId} was deleted successfully from Redis`
            };
        }
    } catch (e) {
        console.error("Redis error deleting session", e);
    }
  }

  if (inMemorySessions.has(sessionId)) {
    inMemorySessions.delete(sessionId);
    userSessions.get(userId.toString())?.delete(sessionId);
    return {
      success: true,
      message: `Session for ${userId} was deleted successfully from memory`
    };
  }
  
  return {
    success: false,
    message: `Session doesn't exist`
  };
}  

export async function deleteAllSession(
  userId: string | number,
  req: Request
): Promise<json> {
  let deletedCount = 0;
  
  if (isRedisConnected()) {
      try {
        const userKey = `user_sessions:${userId}`;
        const sessions = await REDIS_CLIENT.sMembers(userKey);
        
        for (const sessionId of sessions) {
            await REDIS_CLIENT.del(`session:${sessionId}`);
            deletedCount++;
        }
        await REDIS_CLIENT.del(userKey);
        return {
            success: true,
            message: `${deletedCount} sessions were removed from Redis`
        };
      } catch (e) {
          console.error("Redis error deleting all sessions", e);
      }
  }

  // Use in-memory storage
  const userKey = userId.toString();
  const sessions = userSessions.get(userKey);
  if (sessions) {
    sessions.forEach(sessionId => {
      if (inMemorySessions.delete(sessionId)) {
        deletedCount++;
      }
    });
    userSessions.delete(userKey);
  }
  
  return {
    success: true,
    message: `${deletedCount} sessions were removed`
  };
}

export async function getAllSession(
  userId: string | number
): Promise<SessionInfo[]> {
  const results: SessionInfo[] = [];

  if (isRedisConnected()) {
      try {
        const sessions = await REDIS_CLIENT.sMembers(`user_sessions:${userId}`);
        for (const sessionId of sessions) {
            const data = await REDIS_CLIENT.get(`session:${sessionId}`);
            if (data) {
                const sessionData = JSON.parse(data);
                results.push({
                    sessionId,
                    userId: sessionData.userId,
                    ip: sessionData.ip,
                    userAgent: sessionData.userAgent,
                    createdAt: sessionData.createdAt,
                    expiresAt: sessionData.expiresAt
                });
            } else {
                await REDIS_CLIENT.sRem(`user_sessions:${userId}`, sessionId);
            }
        }
        return results;
      } catch (e) {
        console.error("Redis error getting sessions", e);
      }
  }
  const userKey = userId.toString();
  const sessions = userSessions.get(userKey);
  if (sessions) {
    sessions.forEach(sessionId => {
      const sessionData = inMemorySessions.get(sessionId);
      if (sessionData) {
        results.push({
          sessionId,
          userId: sessionData.userId,
          ip: sessionData.ip,
          userAgent: sessionData.userAgent,
          createdAt: sessionData.createdAt,
          expiresAt: sessionData.expiresAt
        });
      }
    });
  }
  return results;
}

export async function removeSpecificSession(
  userId: string | number,
  sessionId: string
): Promise<json> {
  
  if (isRedisConnected()) {
      try {
        const deleted = await REDIS_CLIENT.del(`session:${sessionId}`);
        if (deleted > 0) {
            await REDIS_CLIENT.sRem(`user_sessions:${userId}`, sessionId);
            return {
                success: true,
                message: `Session ${sessionId} deleted for ${userId} from Redis`
            };
        }
      } catch (e) {
          console.error("Redis error removing specific session", e);
      }
  }

  // Use in-memory storage
  const userKey = userId.toString();
  if (inMemorySessions.has(sessionId)) {
    inMemorySessions.delete(sessionId);
    userSessions.get(userKey)?.delete(sessionId);
    return {
      success: true,
      message: `Session ${sessionId} deleted for ${userId}`
    };
  }

  return {
    success: false,
    message: `Session ${sessionId} not found`
  };
}

export async function getSession(sessionId: string) {
  if (!sessionId) return null;
  
  if (isRedisConnected()) {
      try {
          const data = await REDIS_CLIENT.get(`session:${sessionId}`);
          if (data) return JSON.parse(data);
      } catch (e) {
          console.error("Redis error getting session", e);
      }
  }

  return inMemorySessions.get(sessionId) ?? null;
}
