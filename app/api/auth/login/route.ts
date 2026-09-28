import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim();
    const pin = String(body?.pin ?? "").trim();
    if (!username) return NextResponse.json({ message: "Username is required." }, { status: 400 });
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ message: "PIN must be exactly 4 digits." }, { status: 400 });
    const user = await authenticateUser(username, pin);
    if (!user) return NextResponse.json({ message: "Invalid username or PIN." }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ success: true, user: { username: user.username, name: user.name } });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Unable to sign in." }, { status: 500 });
  }
}
