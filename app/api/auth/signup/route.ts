import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const name = String(body?.name ?? "").trim();
    const pin = String(body?.pin ?? "").trim();

    if (!name) {
      return NextResponse.json({ message: "Name is required." }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ message: "Username is required." }, { status: 400 });
    }

    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      return NextResponse.json(
        { message: "Username must be 3–40 characters and use only letters, numbers, dot, underscore or hyphen." },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ message: "PIN must be exactly 4 digits." }, { status: 400 });
    }

    const existing = await sql`
      SELECT user_id
      FROM users
      WHERE LOWER(username) = ${username}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "That username is already in use." },
        { status: 409 }
      );
    }

    const pinHash = await bcrypt.hash(pin, 12);

    const rows = await sql`
      INSERT INTO users (username, name, pin_hash)
      VALUES (${username}, ${name}, ${pinHash})
      RETURNING user_id, username, name
    `;

    const user = rows[0];

    await createSession({
      userId: Number(user.user_id),
      username: user.username,
      name: user.name,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          username: user.username,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Unable to create the account." },
      { status: 500 }
    );
  }
}
