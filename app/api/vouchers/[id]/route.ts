import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

async function getVoucherId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const voucherId = Number(id);
  return Number.isInteger(voucherId) ? voucherId : null;
}

function parseVoucherBody(body: any) {
  const voucherDate = String(body?.voucherDate ?? "").trim();
  const payee = String(body?.payee ?? "").trim();
  const amount = Number(body?.amount);
  const amountInWords = String(body?.amountInWords ?? "").trim();
  const typeOfPayee = String(body?.typeOfPayee ?? "").trim();
  const customPayeeType = body?.customPayeeType == null ? null : String(body.customPayeeType).trim();
  const modeOfPayment = String(body?.modeOfPayment ?? "").trim();
  const towards = String(body?.towards ?? "").trim();
  const payeePan = body?.payeePan ? String(body.payeePan).trim() : null;
  const tds = body?.tds ? String(body.tds).trim() : null;

  return { voucherDate, payee, amount, amountInWords, typeOfPayee, customPayeeType, modeOfPayment, towards, payeePan, tds };
}

function validateVoucher(data: ReturnType<typeof parseVoucherBody>) {
  if (!data.voucherDate) return "Date is required.";
  if (!data.payee) return "Paid To is required.";
  if (!Number.isFinite(data.amount) || data.amount <= 0) return "Please enter a valid amount.";
  if (!data.amountInWords) return "Amount in words is required.";
  if (!data.typeOfPayee) return "Type of payee is required.";
  if (data.typeOfPayee === "Custom" && !data.customPayeeType) return "Custom payee type is required.";
  if (!data.modeOfPayment) return "Mode of payment is required.";
  if (!data.towards) return "Towards is required.";
  return null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const voucherId = await getVoucherId(params);
    if (voucherId === null) return NextResponse.json({ message: "Invalid voucher ID." }, { status: 400 });

    const rows = await sql`
      SELECT v.voucher_id, v.created_by, v.payee, v.amount, v.amount_in_words,
             v.type_of_payee, v.custom_payee_type, v.mode_of_payment, v.towards,
             v.payee_pan, v.tds, v.voucher_date, v.created_at,
             u.name AS created_by_name, u.username AS created_by_username
      FROM vouchers v
      INNER JOIN users u ON u.user_id = v.created_by
      WHERE v.voucher_id = ${voucherId}
        AND v.created_by = ${session.userId}
      LIMIT 1
    `;

    if (!rows.length) return NextResponse.json({ message: "Voucher not found." }, { status: 404 });

    return NextResponse.json({ success: true, voucher: rows[0] });
  } catch (error) {
    console.error("Fetch voucher error:", error);
    return NextResponse.json({ message: "Unable to fetch voucher." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const voucherId = await getVoucherId(params);
    if (voucherId === null) return NextResponse.json({ message: "Invalid voucher ID." }, { status: 400 });

    const body = await request.json();
    const data = parseVoucherBody(body);
    const validationError = validateVoucher(data);
    if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

    const rows = await sql`
      UPDATE vouchers
      SET
        payee = ${data.payee},
        amount = ${data.amount},
        amount_in_words = ${data.amountInWords},
        type_of_payee = ${data.typeOfPayee},
        custom_payee_type = ${data.typeOfPayee === "Custom" ? data.customPayeeType : null},
        mode_of_payment = ${data.modeOfPayment},
        towards = ${data.towards},
        payee_pan = ${data.payeePan},
        tds = ${data.tds},
        voucher_date = ${data.voucherDate},
        updated_at = NOW()
      WHERE voucher_id = ${voucherId}
        AND created_by = ${session.userId}
      RETURNING *
    `;

    if (!rows.length) return NextResponse.json({ message: "Voucher not found." }, { status: 404 });

    return NextResponse.json({ success: true, voucher: rows[0] });
  } catch (error) {
    console.error("Update voucher error:", error);
    return NextResponse.json({ message: "Unable to update voucher." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const voucherId = await getVoucherId(params);
    if (voucherId === null) return NextResponse.json({ message: "Invalid voucher ID." }, { status: 400 });

    const rows = await sql`
      DELETE FROM vouchers
      WHERE voucher_id = ${voucherId}
        AND created_by = ${session.userId}
      RETURNING voucher_id
    `;

    if (!rows.length) return NextResponse.json({ message: "Voucher not found." }, { status: 404 });

    return NextResponse.json({ success: true, voucherId: Number(rows[0].voucher_id) });
  } catch (error) {
    console.error("Delete voucher error:", error);
    return NextResponse.json({ message: "Unable to delete voucher." }, { status: 500 });
  }
}
