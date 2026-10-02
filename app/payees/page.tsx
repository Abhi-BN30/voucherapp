import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PayeesPageClient from "./PayeesPageClient";

export default async function PayeesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  return <PayeesPageClient user={session} />;
}