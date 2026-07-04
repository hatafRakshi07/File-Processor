import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "bissi_salt_2024").digest("hex");
}

function generateToken(userId: number): string {
  return createHash("sha256").update(`${userId}_${Date.now()}_bissi_secret`).digest("hex");
}

// Simple in-memory session store (for demo — production would use Redis/DB)
export const sessions = new Map<string, number>();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken(user.id);
  sessions.set(token, user.id);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      email: user.email,
      phone: user.phone,
    },
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  const token = auth?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = sessions.get(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
    email: user.email,
    phone: user.phone,
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  const token = auth?.replace("Bearer ", "");
  if (token) sessions.delete(token);
  res.json({ success: true });
});

export default router;
