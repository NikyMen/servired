"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction, type AuthState } from "@/app/(auth)/actions";
import { PasswordField, SubmitButton, FormError } from "@/components/auth/fields";
import { SearchIcon, BriefcaseIcon } from "@/components/icons";
import type { Mode } from "@/lib/types";

type Category = { slug: string; name: string; icon: string };

export function RegisterForm({
  categories,
  next,
}: {
  categories: Category[];
  next?: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(registerAction, undefined);
  const [role, setRole] = useState<"cliente" | "profesional">("cliente");

  const isPro = role === "profesional";
  const tone: Mode = isPro ? "pro" : "cliente";
  const focus = isPro
    ? "focus:border-pro focus:ring-pro/20"
    : "focus:border-cliente focus:ring-cliente/20";
  const field = `w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:ring-2 ${focus}`;

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900">Creá tu cuenta</h2>
      <p className="mt-1 text-sm text-slate-500">
        ¿Ya tenés una?{" "}
        <Link
          href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"}
          className={`font-semibold hover:underline ${isPro ? "text-pro" : "text-cliente"}`}
        >
          Entrá
        </Link>
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {/* El rol define de qué color es la cuenta y si se crea perfil público. */}
        <input type="hidden" name="role" value={role} />
        {next && <input type="hidden" name="next" value={next} />}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            ¿A qué venís?
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              selected={!isPro}
              onSelect={() => setRole("cliente")}
              tone="cliente"
              icon={<SearchIcon width={18} height={18} />}
              title="Contratar"
              subtitle="Busco un servicio"
            />
            <RoleCard
              selected={isPro}
              onSelect={() => setRole("profesional")}
              tone="pro"
              icon={<BriefcaseIcon width={18} height={18} />}
              title="Ofrecer"
              subtitle="Doy servicios"
            />
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            {isPro ? "Nombre o nombre del negocio" : "Nombre"}
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder={isPro ? "Carlos López" : "María G."}
            className={field}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="vos@email.com"
            className={field}
          />
        </div>

        <PasswordField
          id="password"
          label="Contraseña"
          autoComplete="new-password"
          tone={tone}
          hint="Mínimo 8 caracteres."
        />

        {/* Datos del perfil público. Solo los pide el que va a ofrecer servicios. */}
        {isPro && (
          <div className="animate-fade-in space-y-4 rounded-2xl border border-pro/30 bg-pro-soft/60 p-4">
            <p className="text-xs font-bold tracking-wide text-pro-dark uppercase">
              Tu perfil público
            </p>

            <div className="space-y-1.5">
              <label htmlFor="categoria" className="text-sm font-medium text-slate-700">
                Rubro
              </label>
              <select id="categoria" name="categoria" required defaultValue="" className={field}>
                <option value="" disabled>
                  Elegí tu rubro…
                </option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="headline" className="text-sm font-medium text-slate-700">
                ¿A qué te dedicás?
              </label>
              <input
                id="headline"
                name="headline"
                required
                placeholder="Plomero matriculado"
                className={field}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="zone" className="text-sm font-medium text-slate-700">
                  Zona
                </label>
                <input
                  id="zone"
                  name="zone"
                  required
                  placeholder="Zona Norte, CABA"
                  className={field}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="priceFrom" className="text-sm font-medium text-slate-700">
                  Precio desde
                </label>
                <input
                  id="priceFrom"
                  name="priceFrom"
                  type="number"
                  min={0}
                  step={500}
                  defaultValue={10000}
                  className={field}
                />
              </div>
            </div>
          </div>
        )}

        <FormError message={state?.error} />

        <SubmitButton tone={tone} pendingLabel="Creando tu cuenta…">
          {isPro ? "Empezar a ofrecer" : "Crear cuenta"}
        </SubmitButton>

        <p className="text-center text-xs text-slate-400">
          Podés cambiar de lado cuando quieras con el interruptor de arriba.
        </p>
      </form>
    </div>
  );
}

function RoleCard({
  selected,
  onSelect,
  tone,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  tone: Mode;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const isPro = tone === "pro";
  const on = isPro
    ? "border-pro bg-pro-soft ring-2 ring-pro/25"
    : "border-cliente bg-cliente-soft ring-2 ring-cliente/25";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-2xl border p-3.5 text-left transition-all ${
        selected ? on : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span
        className={`inline-flex size-9 items-center justify-center rounded-xl transition-colors ${
          selected
            ? `text-white ${isPro ? "bg-pro" : "bg-cliente"}`
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {icon}
      </span>
      <span
        className={`mt-2.5 block text-sm font-bold ${
          selected ? (isPro ? "text-pro-dark" : "text-cliente-dark") : "text-slate-700"
        }`}
      >
        {title}
      </span>
      <span className="block text-xs text-slate-500">{subtitle}</span>
    </button>
  );
}
