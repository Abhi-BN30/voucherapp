import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CreateVoucherForm from "./CreateVoucherForm";
export default async function CreateVoucherPage(){const session=await getSession();if(!session)redirect('/');return <CreateVoucherForm user={session}/>;}
