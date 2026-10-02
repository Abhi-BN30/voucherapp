import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payees = await sql`
      SELECT
        payee_id,
        payee_name
      FROM payees
      ORDER BY LOWER(payee_name) ASC, payee_id ASC
    `;

    return NextResponse.json({
      success: true,
      payees,
    });
  } catch (error) {
    console.error("Fetch payees error:", error);

    return NextResponse.json(
      { message: "Unable to fetch payees." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const payeeName = String(
      body?.payeeName ?? ""
    ).trim();

    if (!payeeName) {
      return NextResponse.json(
        { message: "Payee name is required." },
        { status: 400 }
      );
    }

    if (payeeName.length > 150) {
      return NextResponse.json(
        { message: "Payee name cannot exceed 150 characters." },
        { status: 400 }
      );
    }

    /*
     * Try to create the payee.
     *
     * The unique index on LOWER(BTRIM(payee_name))
     * prevents duplicates such as:
     *
     * John Doe
     * john doe
     * JOHN DOE
     */
    await sql`
      INSERT INTO payees (payee_name)
      VALUES (${payeeName})
      ON CONFLICT DO NOTHING
    `;

    /*
     * Return the canonical existing/new record.
     */
    const rows = await sql`
      SELECT
        payee_id,
        payee_name
      FROM payees
      WHERE LOWER(BTRIM(payee_name)) =
            LOWER(BTRIM(${payeeName}))
      LIMIT 1
    `;

    if (!rows.length) {
      return NextResponse.json(
        { message: "Unable to register payee." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        payee: rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create payee error:", error);

    return NextResponse.json(
      { message: "Unable to register payee." },
      { status: 500 }
    );
  }
}