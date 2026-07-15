import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyToken, TokenAudience } from "../utils/jwt";

// Extend Express Request with the authenticated principal
declare global {
  namespace Express {
    interface Request {
      auth?: {
        id: string;
        email: string;
        role?: string;
        audience: TokenAudience;
      };
    }
  }
}

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing bearer token");
  }
  return header.slice("Bearer ".length);
}

// Requires a valid Agent (dashboard) JWT
export function requireAgentAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    const payload = verifyToken(token, "agent");
    req.auth = { id: payload.sub, email: payload.email, role: payload.role, audience: "agent" };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired agent session"));
  }
}

// Requires a valid Client (portal) JWT
export function requireClientAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    const payload = verifyToken(token, "client");
    req.auth = { id: payload.sub, email: payload.email, audience: "client" };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired client session"));
  }
}

// Accepts either an Agent or a Client token (e.g. shared read endpoints)
export function requireAnyAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    try {
      const payload = verifyToken(token, "agent");
      req.auth = { id: payload.sub, email: payload.email, role: payload.role, audience: "agent" };
      return next();
    } catch {
      const payload = verifyToken(token, "client");
      req.auth = { id: payload.sub, email: payload.email, audience: "client" };
      return next();
    }
  } catch {
    next(ApiError.unauthorized("Invalid or expired session"));
  }
}

// Optional API-key gate for AI voice agent / webhook callers (e.g. Twilio, LLM orchestrator)
export function requireServiceKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers["x-service-key"];
  if (!key || key !== process.env.AI_SERVICE_KEY) {
    return next(ApiError.unauthorized("Invalid service key"));
  }
  next();
}
