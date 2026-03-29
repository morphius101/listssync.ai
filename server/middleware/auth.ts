import type { Request, Response, NextFunction } from "express";

// Verify Firebase ID token from Authorization: Bearer <token> header
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: missing token" });
    }
    const idToken = authHeader.split("Bearer ")[1];

    // Verify with Firebase Admin
    const { getAuth } = await import("firebase-admin/auth");
    const decodedToken = await getAuth().verifyIdToken(idToken);
    (req as any).user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}
