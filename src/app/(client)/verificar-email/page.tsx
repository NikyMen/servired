import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSession, getSessionUser } from "@/lib/auth";
import { consumeEmailVerification } from "@/lib/email-verification";
import { clearPendingVerification, getPendingVerificationUserId } from "@/lib/pending-verification";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const user = await getSessionUser();

  if (user) {
    if (token) await consumeEmailVerification(user.id, token);
  } else {
    // Alta a medio hacer: el enlace del mail confirma el código y recién ahí
    // se crea la sesión. Sin token o sin cookie válida, no hay nada que hacer.
    const pendingId = await getPendingVerificationUserId();
    if (!pendingId) redirect("/entrar?next=/onboarding");
    if (token) {
      const result = await consumeEmailVerification(pendingId, token);
      if (result.ok) {
        await createSession(pendingId);
        await clearPendingVerification();
      }
    }
  }

  const next = (await cookies()).get("servired_after_verify")?.value;
  redirect(`/onboarding${next?.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : ""}`);
}
