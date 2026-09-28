import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function GET() { try { const result=await sql`SELECT NOW() AS database_time`; return NextResponse.json({success:true,message:"Connected to Neon successfully",databaseTime:result[0].database_time}); } catch(error){ console.error(error); return NextResponse.json({success:false,message:"Database connection failed"},{status:500}); } }
