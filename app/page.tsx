import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";
export default async function Home(){ const session=await getSession(); if(session) redirect('/dashboard'); return <LoginForm/>; }
