import { type Request, type Response, type NextFunction } from "express";
import { sessions } from "../routes/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  const token = auth?.replace("Bearer ", "").trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = sessions.get(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  // Attach userId for downstream use
  (req as any).userId = userId;
  next();
}
