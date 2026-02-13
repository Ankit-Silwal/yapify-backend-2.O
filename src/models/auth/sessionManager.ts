import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
const SESSION_TTL = 24 * 60 * 60;


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
  
  // Use in-memory storage
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
  
  console.log(`Session created successfully for ${userId}`);
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
  
  if (inMemorySessions.has(sessionId)) {
    inMemorySessions.delete(sessionId);
    userSessions.get(userId.toString())?.delete(sessionId);
    return {
      success: true,
      message: `Session for ${userId} was deleted successfully`
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
  
  // Use in-memory storage
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

  return inMemorySessions.get(sessionId) ?? null;
}
