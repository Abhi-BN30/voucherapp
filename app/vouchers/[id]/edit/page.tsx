import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import VoucherForm from "@/components/VoucherForm";

export default async function EditVoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");

  const { id } = await params;
  const voucherId = Number(id);

  if (!Number.isInteger(voucherId)) notFound();

  const rows = await sql`
    SELECT voucher_id, voucher_date, payee, amount, amount_in_words,
           type_of_payee, custom_payee_type, mode_of_payment, towards,
           payee_pan, tds
    FROM vouchers
    WHERE voucher_id = ${voucherId}
      AND created_by = ${session.userId}
      AND deleted_at IS NULL
    LIMIT 1
  `;

  if (rows.length === 0) notFound();

  return (
    <VoucherForm
      user={session}
      mode="edit"
      initialVoucher={rows[0] as any}
    />
  );
}
