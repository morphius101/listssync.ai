import type { Request, Response, NextFunction } from "express";

// Decode JWT payload without verification (dev fallback only — not cryptographically safe)
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
    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (hasServiceAccount) {
      try {
        const { getAuth } = await import("firebase-admin/auth");
        const decodedToken = await getAuth().verifyIdToken(idToken);
        (req as any).user = { uid: decodedToken.uid, email: decodedToken.email };
        return next();
      } catch (verifyError: any) {
        console.error("🔴 Firebase verifyIdToken failed:", verifyError?.message || verifyError);
        return res.status(401).json({ error: "Unauthorized: token verification failed" });
      }
    }

    if (process.env.NODE_ENV === "production") {
      console.error("🔴 FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in production");
      return res.status(500).json({ error: "Authentication is not configured correctly" });
    }

    // Development-only fallback when Firebase Admin is not configured locally.
    const decoded = decodeJwtPayload(idToken);
    if (!decoded?.sub) {
      return res.status(401).json({ error: "Unauthorized: invalid token" });
    }

    (req as any).user = { uid: decoded.sub, email: decoded.email };
    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}
