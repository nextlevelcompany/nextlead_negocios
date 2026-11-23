import { redirect } from "next/navigation";

export default async function ContactDynamicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/contactos/view?id=${id}`);
}
