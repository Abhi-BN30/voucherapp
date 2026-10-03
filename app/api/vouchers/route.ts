import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const from = searchParams.get("from")?.trim() || "";
    const to = searchParams.get("to")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const mode = searchParams.get("mode")?.trim() || "";
    const archived = searchParams.get("archived") === "1";
    const p = search ? `%${search}%` : null;
    const fromDate = from || null, toDate = to || null, typeFilter = type || null, modeFilter = mode || null;
    const vouchers = await sql`
      SELECT v.voucher_id,v.created_by,v.payee,v.amount,v.amount_in_words,v.type_of_payee,v.custom_payee_type,
             v.mode_of_payment,v.towards,v.payee_pan,v.tds,v.voucher_date,v.created_at,v.updated_at,v.deleted_at,
             u.name AS created_by_name,u.username AS created_by_username
      FROM vouchers v INNER JOIN users u ON u.user_id=v.created_by
      WHERE v.created_by=${session.userId}
        AND (${archived} = (v.deleted_at IS NOT NULL))
        AND (${p}::text IS NULL OR
             CAST(v.voucher_id AS text) ILIKE ${p} OR v.payee ILIKE ${p} OR
             v.type_of_payee::text ILIKE ${p} OR COALESCE(v.custom_payee_type,'') ILIKE ${p} OR
             v.towards ILIKE ${p} OR CAST(v.amount AS text) ILIKE ${p} OR v.mode_of_payment::text ILIKE ${p})
        AND (${fromDate}::date IS NULL OR v.voucher_date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR v.voucher_date <= ${toDate}::date)
        AND (${typeFilter}::text IS NULL OR v.type_of_payee::text=${typeFilter})
        AND (${modeFilter}::text IS NULL OR v.mode_of_payment::text=${modeFilter})
      ORDER BY v.voucher_date DESC,v.voucher_id DESC`;
    return NextResponse.json({ success:true, vouchers });
  } catch (error) { console.error(error); return NextResponse.json({ error:"Unable to fetch vouchers" }, { status:500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message:"Unauthorized" }, { status:401 });
    const body = await request.json();
    const voucherDate=String(body?.voucherDate??"").trim(), payee=String(body?.payee??"").trim();
    const amount=Number(body?.amount), amountInWords=String(body?.amountInWords??"").trim();
    const typeOfPayee=String(body?.typeOfPayee??"").trim();
    const customPayeeType=body?.customPayeeType==null?null:String(body.customPayeeType).trim();
    const modeOfPayment=String(body?.modeOfPayment??"").trim(), towards=String(body?.towards??"").trim();
    const payeePan=body?.payeePan?String(body.payeePan).trim():null, tds=body?.tds?String(body.tds).trim():null;
    const allowDuplicate=body?.allowDuplicate===true;
    if(!voucherDate) return NextResponse.json({message:"Date is required."},{status:400});
    if(!payee) return NextResponse.json({message:"Paid To is required."},{status:400});
    if(!Number.isFinite(amount)||amount<=0) return NextResponse.json({message:"Please enter a valid amount."},{status:400});
    if(!amountInWords) return NextResponse.json({message:"Amount in words is required."},{status:400});
    if(!typeOfPayee) return NextResponse.json({message:"Type of payee is required."},{status:400});
    if(typeOfPayee==="Custom"&&!customPayeeType) return NextResponse.json({message:"Custom payee type is required."},{status:400});
    if(!modeOfPayment) return NextResponse.json({message:"Mode of payment is required."},{status:400});
    if(!towards) return NextResponse.json({message:"Towards is required."},{status:400});
    if(!allowDuplicate){
      const dup=await sql`SELECT voucher_id,voucher_date,payee,amount,towards FROM vouchers WHERE created_by=${session.userId} AND deleted_at IS NULL AND voucher_date=${voucherDate} AND LOWER(BTRIM(payee))=LOWER(BTRIM(${payee})) AND amount=${amount} AND LOWER(BTRIM(towards))=LOWER(BTRIM(${towards})) LIMIT 1`;
      if(dup.length) return NextResponse.json({message:`A similar voucher already exists: #${dup[0].voucher_id}. Save anyway if this is intentional.`,duplicate:dup[0]},{status:409});
    }
    await sql`INSERT INTO payees (payee_name) VALUES (${payee}) ON CONFLICT DO NOTHING`;
    const rows=await sql`INSERT INTO vouchers (created_by,payee,amount,amount_in_words,type_of_payee,custom_payee_type,mode_of_payment,towards,payee_pan,tds,voucher_date) VALUES (${session.userId},${payee},${amount},${amountInWords},${typeOfPayee},${typeOfPayee==="Custom"?customPayeeType:null},${modeOfPayment},${towards},${payeePan},${tds},${voucherDate}) RETURNING *`;
    return NextResponse.json({success:true,voucher:rows[0]},{status:201});
  } catch(error){console.error(error);return NextResponse.json({message:"Unable to save voucher."},{status:500});}
}
