import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateVoucherPDF } from "@/lib/voucher-pdf";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const ids = Array.isArray(body?.voucherIds)
      ? body.voucherIds.map(Number).filter((id: number) => Number.isInteger(id))
      : [];

    if (ids.length === 0) return NextResponse.json({ message: "No vouchers selected." }, { status: 400 });
    if (ids.length > 100) return NextResponse.json({ message: "You can download up to 100 vouchers at a time." }, { status: 400 });

    const rows = await sql`
      SELECT voucher_id,voucher_date,payee,amount,amount_in_words,type_of_payee,custom_payee_type,mode_of_payment,towards,payee_pan,tds
      FROM vouchers
      WHERE voucher_id = ANY(${ids}::bigint[])
        AND created_by = ${session.userId}
      ORDER BY voucher_date ASC, voucher_id ASC
    `;

    if (rows.length === 0) return NextResponse.json({ message: "No matching vouchers found." }, { status: 404 });

    const pdf = await generateVoucherPDF(rows as any);

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="payment-vouchers.pdf"',
      },
    });
  } catch (error) {
    console.error("Bulk voucher PDF error:", error);
    return NextResponse.json({ message: "Unable to generate PDF." }, { status: 500 });
  }
}
