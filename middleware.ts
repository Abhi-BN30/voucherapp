import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
const protectedPrefixes=["/dashboard","/vouchers","/payees"];
export async function middleware(request:NextRequest){const path=request.nextUrl.pathname;if(!protectedPrefixes.some(p=>path===p||path.startsWith(`${p}/`)))return NextResponse.next();const token=request.cookies.get('voucher_session')?.value;if(!token)return NextResponse.redirect(new URL('/',request.url));try{await jwtVerify(token,new TextEncoder().encode(process.env.SESSION_SECRET));return NextResponse.next()}catch{return NextResponse.redirect(new URL('/',request.url))}}
export const config={matcher:["/dashboard/:path*","/vouchers/:path*","/payees/:path*"]};
