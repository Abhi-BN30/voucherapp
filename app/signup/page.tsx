import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <SignupForm />;
}
