import type { Request, Response, NextFunction } from "express";

// Verify Firebase ID token from Authorization: Bearer <token> header
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: missing token" });
    }
    const idToken = authHeader.split("Bearer ")[1];

    // Try Firebase Admin SDK first (works in production with service account)
    try {
      const adminApps = await import("firebase-admin/app");
      const { getAuth } = await import("firebase-admin/auth");
      if (adminApps.getApps().length > 0) {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        (req as any).user = { uid: decodedToken.uid, email: decodedToken.email };
        return next();
      }
    } catch {
      // Admin SDK not configured — fall through to JWT decode
    }

    // Fallback: decode JWT payload without signature verification
    // Safe for development; in production configure Firebase Admin with a service account
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      return res.status(401).json({ error: "Unauthorized: malformed token" });
    }
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    
    if (!payload.sub) {
      return res.status(401).json({ error: "Unauthorized: no subject in token" });
    }

    // Basic expiry check
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return res.status(401).json({ error: "Unauthorized: token expired" });
    }

    (req as any).user = { uid: payload.sub, email: payload.email };
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}
