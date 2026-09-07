import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPendingVerificationUserId } from "@/lib/pending-verification";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/components/OnboardingForm";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function safeNext(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const storedNext = (await cookies()).get("servired_after_verify")?.value;
  const user = await getSessionUser();

  // Sin sesión: puede ser un alta a medio hacer (se registró pero todavía no
  // confirmó el código). Ahí mostramos el form igual, sin loguear a nadie.
  if (!user) {
    const pendingId = await getPendingVerificationUserId();
    if (!pendingId) redirect("/entrar?next=/onboarding");
    const pending = await prisma.user.findUnique({ where: { id: pendingId }, select: { email: true } });
    if (!pending) redirect("/entrar?next=/onboarding");
    return <OnboardingForm email={pending.email} />;
  }

  if (user.emailVerified && user.accountStatus === "approved") redirect(safeNext(next || storedNext));
  return <OnboardingForm email={user.email} />;
}
