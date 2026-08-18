import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@ecommerce/shared-types';

export interface TokenOptions {
  expiresIn?: string;
  issuer?: string;
  audience?: string;
}

export type TokenPayload = Omit<JwtPayload, 'iat' | 'exp'>;

export function signToken(
  payload: TokenPayload,
  secret: string,
  options?: TokenOptions
): string {
  return jwt.sign(payload, secret, {
    expiresIn: options?.expiresIn || '15m',
    issuer: options?.issuer || 'ecommerce-platform',
    audience: options?.audience || 'ecommerce-client',
  });
}

export function verifyToken(
  token: string,
  secret: string
): JwtPayload | null {
  try {
    return jwt.verify(token, secret, {
      issuer: 'ecommerce-platform',
      audience: 'ecommerce-client',
    }) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export function refreshToken(
  payload: TokenPayload,
  secret: string,
  options?: TokenOptions
): string {
  return jwt.sign(payload, secret, {
    expiresIn: options?.expiresIn || '7d',
    issuer: options?.issuer || 'ecommerce-platform',
    audience: options?.audience || 'ecommerce-refresh',
  });
}

export function decodeToken(token: string): any {
  return jwt.decode(token);
}
