import { redirect } from "next/navigation";
import { consumeEmailVerification } from "@/lib/email-verification";
import { getSessionUser } from "@/lib/auth";
import { cookies } from "next/headers";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/onboarding");
  const { token } = await searchParams;
  if (token) await consumeEmailVerification(user.id, token);
  const next = (await cookies()).get("servired_after_verify")?.value;
  redirect(`/onboarding${next?.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : ""}`);
}
