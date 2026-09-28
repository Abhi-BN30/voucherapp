import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export type AuthenticatedUser = { userId: number; username: string; name: string };

export async function authenticateUser(username: string, pin: string): Promise<AuthenticatedUser | null> {
  const normalizedUsername = username.trim().toLowerCase();
  const users = await sql`SELECT user_id, username, name, pin_hash FROM users WHERE LOWER(username) = ${normalizedUsername} LIMIT 1`;
  if (users.length === 0) return null;
  const user = users[0];
  if (!(await bcrypt.compare(pin, user.pin_hash))) return null;
  return { userId: Number(user.user_id), username: String(user.username), name: String(user.name) };
}
