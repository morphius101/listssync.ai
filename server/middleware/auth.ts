import type { Request, Response, NextFunction } from "express";

// Decode JWT payload without verification (fallback only — not cryptographically safe)
function decodeJwtPayload(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Verify Firebase ID token from Authorization: Bearer <token> header
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: missing token" });
    }
    const idToken = authHeader.split("Bearer ")[1];

    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      // Production: verify with Firebase Admin (cryptographically safe)
      const { getAuth } = await import("firebase-admin/auth");
      const decodedToken = await getAuth().verifyIdToken(idToken);
      (req as any).user = { uid: decodedToken.uid, email: decodedToken.email };
    } else {
      // Dev/fallback: decode JWT without verification
      // ⚠️ Only acceptable when FIREBASE_SERVICE_ACCOUNT_BASE64 is not set (local dev)
      const decoded = decodeJwtPayload(idToken);
      if (!decoded?.sub) {
        return res.status(401).json({ error: "Unauthorized: invalid token" });
      }
      (req as any).user = { uid: decoded.sub, email: decoded.email };
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}
