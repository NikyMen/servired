import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/OnboardingForm";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function safeNext(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/onboarding");
  const { next } = await searchParams;
  const storedNext = (await cookies()).get("servired_after_verify")?.value;
  if (user.emailVerified && user.accountStatus === "approved") redirect(safeNext(next || storedNext));
  return <OnboardingForm email={user.email} />;
}
