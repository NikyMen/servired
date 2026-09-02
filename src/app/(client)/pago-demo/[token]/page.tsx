import { notFound, redirect } from "next/navigation";
import { PaymentDemoButton } from "@/components/PaymentDemoButton";
import { getSessionUser } from "@/lib/auth";
import { formatARS } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PagoDemoPage({ params }: { params: Promise<{ token: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const user = await getSessionUser(); if (!user) redirect("/entrar");
  const { token } = await params; const payment = await prisma.payment.findUnique({ where: { checkoutToken: token }, include: { professional: true } });
  if (!payment || payment.userId !== user.id) notFound();
  return <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-xl"><p className="text-sm font-bold text-[#009ee3]">Mercado Pago · DEMO</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Pagar {formatARS(payment.amount)}</h1><p className="mt-1 text-sm text-slate-500">Profesional: {payment.professional.businessName || payment.professional.name}</p><div className="my-5 rounded-2xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>Total</span><strong>{formatARS(payment.amount)}</strong></div><p className="mt-2 text-xs text-slate-400">Simulación sin movimiento de dinero real.</p></div>{payment.status === "pagado" ? <p className="rounded-xl bg-emerald-50 p-3 text-center font-semibold text-emerald-700">Pago aprobado</p> : <PaymentDemoButton paymentId={payment.id} />}</div>;
}
