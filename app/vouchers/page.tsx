import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import VouchersPageClient from "./VouchersPageClient";
export default async function VouchersPage(){const session=await getSession();if(!session)redirect('/');return <VouchersPageClient user={session}/>;}
