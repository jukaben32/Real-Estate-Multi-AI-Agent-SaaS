import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type TokenAudience = "agent" | "client";

interface TokenPayload {
  sub: string; // user id
  email: string;
  aud: TokenAudience;
  role?: string;
}

export function signToken(payload: Omit<TokenPayload, "aud">, audience: TokenAudience): string {
  const secret = audience === "agent" ? env.jwtAgentSecret : env.jwtClientSecret;
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign({ ...payload, aud: audience }, secret, options);
}

export function verifyToken(token: string, audience: TokenAudience): TokenPayload {
  const secret = audience === "agent" ? env.jwtAgentSecret : env.jwtClientSecret;
  return jwt.verify(token, secret) as TokenPayload;
}
