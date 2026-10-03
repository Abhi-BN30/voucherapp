import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")?.trim() || "";
    const to = searchParams.get("to")?.trim() || "";
    const fromDate = from || null;
    const toDate = to || null;

    const summary = await sql`
      SELECT COUNT(*)::int AS voucher_count,
             COALESCE(SUM(amount),0)::numeric AS total_amount,
             COALESCE(MAX(amount),0)::numeric AS largest_amount
      FROM vouchers
      WHERE created_by=${session.userId} AND deleted_at IS NULL
        AND (${fromDate}::date IS NULL OR voucher_date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR voucher_date <= ${toDate}::date)
    `;
    const modes = await sql`
      SELECT mode_of_payment AS mode, COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric AS amount
      FROM vouchers WHERE created_by=${session.userId} AND deleted_at IS NULL
        AND (${fromDate}::date IS NULL OR voucher_date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR voucher_date <= ${toDate}::date)
      GROUP BY mode_of_payment ORDER BY amount DESC`;
    const types = await sql`
      SELECT type_of_payee AS type, COALESCE(custom_payee_type,'') AS custom_type,
             COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric AS amount
      FROM vouchers WHERE created_by=${session.userId} AND deleted_at IS NULL
        AND (${fromDate}::date IS NULL OR voucher_date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR voucher_date <= ${toDate}::date)
      GROUP BY type_of_payee, custom_payee_type ORDER BY amount DESC LIMIT 10`;
    const monthly = await sql`
      SELECT TO_CHAR(DATE_TRUNC('month',voucher_date),'YYYY-MM') AS month,
             COALESCE(SUM(amount),0)::numeric AS amount, COUNT(*)::int AS count
      FROM vouchers WHERE created_by=${session.userId} AND deleted_at IS NULL
        AND (${fromDate}::date IS NULL OR voucher_date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR voucher_date <= ${toDate}::date)
      GROUP BY DATE_TRUNC('month',voucher_date) ORDER BY DATE_TRUNC('month',voucher_date)`;
    const recent = await sql`
      SELECT voucher_id,voucher_date,payee,amount,type_of_payee,custom_payee_type,mode_of_payment,towards
      FROM vouchers WHERE created_by=${session.userId} AND deleted_at IS NULL
      ORDER BY voucher_date DESC,voucher_id DESC LIMIT 6`;
    return NextResponse.json({ success:true, summary:summary[0], modes, types, monthly, recent });
  } catch (error) {
    console.error("Dashboard stats error", error);
    return NextResponse.json({ message:"Unable to load dashboard analytics." }, { status:500 });
  }
}
