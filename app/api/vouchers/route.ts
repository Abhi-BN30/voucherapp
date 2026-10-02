import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams.get("search")?.trim() || "";

    const from =
      searchParams.get("from")?.trim() || "";

    const to =
      searchParams.get("to")?.trim() || "";

    const type =
      searchParams.get("type")?.trim() || "";

    const mode =
      searchParams.get("mode")?.trim() || "";

    const fromDate = from || null;
    const toDate = to || null;
    const typeFilter = type || null;
    const modeFilter = mode || null;

    /*
     * Global search:
     *
     * The search value is checked against every
     * meaningful voucher column.
     */
    const searchPattern = search
      ? `%${search}%`
      : null;

    const vouchers = await sql`
      SELECT
        v.voucher_id,
        v.created_by,
        v.payee,
        v.amount,
        v.amount_in_words,
        v.type_of_payee,
        v.custom_payee_type,
        v.mode_of_payment,
        v.towards,
        v.payee_pan,
        v.tds,
        v.voucher_date,
        v.created_at,
        u.name AS created_by_name,
        u.username AS created_by_username
      FROM vouchers v
      INNER JOIN users u
        ON u.user_id = v.created_by

      WHERE v.created_by = ${session.userId}

        AND (
          ${searchPattern}::text IS NULL

          OR v.voucher_id::text ILIKE ${searchPattern}
          OR v.voucher_date::text ILIKE ${searchPattern}
          OR v.payee ILIKE ${searchPattern}
          OR v.amount::text ILIKE ${searchPattern}
          OR v.amount_in_words ILIKE ${searchPattern}
          OR v.type_of_payee::text ILIKE ${searchPattern}
          OR COALESCE(
              v.custom_payee_type,
              ''
            ) ILIKE ${searchPattern}
          OR v.mode_of_payment::text ILIKE ${searchPattern}
          OR v.towards ILIKE ${searchPattern}
          OR COALESCE(
              v.payee_pan,
              ''
            ) ILIKE ${searchPattern}
          OR COALESCE(
              v.tds,
              ''
            ) ILIKE ${searchPattern}
          OR u.name ILIKE ${searchPattern}
          OR u.username ILIKE ${searchPattern}
        )

        AND (
          ${fromDate}::date IS NULL
          OR v.voucher_date >= ${fromDate}::date
        )

        AND (
          ${toDate}::date IS NULL
          OR v.voucher_date <= ${toDate}::date
        )

        AND (
          ${typeFilter}::text IS NULL
          OR v.type_of_payee::text = ${typeFilter}
        )

        AND (
          ${modeFilter}::text IS NULL
          OR v.mode_of_payment::text = ${modeFilter}
        )

      /*
       * Stable default ordering.
       *
       * Newest voucher date first and voucher ID
       * breaks ties consistently.
       */
      ORDER BY
        v.voucher_date DESC,
        v.voucher_id DESC
    `;

    return NextResponse.json({
      success: true,
      vouchers,
    });
  } catch (error) {
    console.error(
      "Fetch vouchers error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to fetch vouchers",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const voucherDate = String(
      body?.voucherDate ?? ""
    ).trim();

    const payee = String(
      body?.payee ?? ""
    ).trim();

    const amount = Number(body?.amount);

    const amountInWords = String(
      body?.amountInWords ?? ""
    ).trim();

    const typeOfPayee = String(
      body?.typeOfPayee ?? ""
    ).trim();

    const customPayeeType =
      body?.customPayeeType == null
        ? null
        : String(
            body.customPayeeType
          ).trim();

    const modeOfPayment = String(
      body?.modeOfPayment ?? ""
    ).trim();

    const towards = String(
      body?.towards ?? ""
    ).trim();

    const payeePan = body?.payeePan
      ? String(body.payeePan).trim()
      : null;

    const tds = body?.tds
      ? String(body.tds).trim()
      : null;

    if (!voucherDate) {
      return NextResponse.json(
        { message: "Date is required." },
        { status: 400 }
      );
    }

    if (!payee) {
      return NextResponse.json(
        { message: "Paid To is required." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          message:
            "Please enter a valid amount.",
        },
        { status: 400 }
      );
    }

    if (!amountInWords) {
      return NextResponse.json(
        {
          message:
            "Amount in words is required.",
        },
        { status: 400 }
      );
    }

    if (!typeOfPayee) {
      return NextResponse.json(
        {
          message:
            "Type of payee is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeOfPayee === "Custom" &&
      !customPayeeType
    ) {
      return NextResponse.json(
        {
          message:
            "Custom payee type is required.",
        },
        { status: 400 }
      );
    }

    if (!modeOfPayment) {
      return NextResponse.json(
        {
          message:
            "Mode of payment is required.",
        },
        { status: 400 }
      );
    }

    if (!towards) {
      return NextResponse.json(
        {
          message:
            "Towards is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Automatically register the payee.
     *
     * If the payee already exists, the unique
     * index prevents a duplicate.
     */
    await sql`
      INSERT INTO payees (payee_name)
      VALUES (${payee})
      ON CONFLICT DO NOTHING
    `;

    const rows = await sql`
      INSERT INTO vouchers (
        created_by,
        payee,
        amount,
        amount_in_words,
        type_of_payee,
        custom_payee_type,
        mode_of_payment,
        towards,
        payee_pan,
        tds,
        voucher_date
      )
      VALUES (
        ${session.userId},
        ${payee},
        ${amount},
        ${amountInWords},
        ${typeOfPayee},
        ${
          typeOfPayee === "Custom"
            ? customPayeeType
            : null
        },
        ${modeOfPayment},
        ${towards},
        ${payeePan},
        ${tds},
        ${voucherDate}
      )
      RETURNING *
    `;

    return NextResponse.json(
      {
        success: true,
        voucher: rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create voucher error:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to save voucher.",
      },
      { status: 500 }
    );
  }
}