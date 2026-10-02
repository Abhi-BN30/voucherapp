import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateVoucherPDF } from "@/lib/voucher-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const voucherId = Number(id);

    if (!Number.isInteger(voucherId)) {
      return NextResponse.json(
        { message: "Invalid voucher ID" },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT
        voucher_id,
        voucher_date,
        payee,
        amount,
        amount_in_words,
        type_of_payee,
        custom_payee_type,
        mode_of_payment,
        towards,
        payee_pan,
        tds
      FROM vouchers
      WHERE voucher_id = ${voucherId}
        AND created_by = ${session.userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Voucher not found" },
        { status: 404 }
      );
    }

    const pdf = await generateVoucherPDF([
      rows[0] as any,
    ]);

    const pdfBuffer = Buffer.from(pdf);

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="voucher-${voucherId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Voucher PDF generation failed:", error);

    return NextResponse.json(
      {
        message: "Unable to generate PDF.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}