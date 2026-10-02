"use client";

import VoucherForm from "@/components/VoucherForm";

type Props = { user: { userId: number; username: string; name: string } };

export default function CreateVoucherForm({ user }: Props) {
  return <VoucherForm user={user} mode="create" />;
}
