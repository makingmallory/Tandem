import { redirect } from "next/navigation";

export default async function LegacyTargetEditPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  redirect(`/chores/${id}`);
}
