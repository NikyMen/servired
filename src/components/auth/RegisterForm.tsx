"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { registerAction, type AuthState } from "@/app/(auth)/actions";
import { PasswordField, SubmitButton, FormError } from "@/components/auth/fields";
import {
  SearchIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  SwitchIcon,
  CameraIcon,
  ImageIcon,
  ChevronLeftIcon,
  XIcon,
} from "@/components/icons";
import { initials } from "@/lib/format";
import type { Mode } from "@/lib/types";

type Category = { id: string; slug: string; name: string; icon: string; parentId: string | null; parent: { name: string } | null };

const FIELD = "glass-field px-3.5 py-3 text-sm";

/** Mismo set que acepta el server; el literal se repite porque src/lib/uploads
    es de Node y no puede entrar al bundle del cliente. */
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/** Campos del paso 1: si el server se queja de alguno, hay que volver ahí. */
const STEP_1_FIELDS = ["name", "email", "password"];

export function RegisterForm({
  categories,
  next,
  initialRole = "cliente",
}: {
  categories: Category[];
  next?: string;
  initialRole?: "cliente" | "profesional";
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(registerAction, undefined);
  const [role, setRole] = useState<"cliente" | "profesional">(initialRole);
  // El alta de profesional pide bastante más que la de cliente. En vez de
  // estirar la página hacia abajo, el mismo panel pasa a un segundo paso.
  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [name, setName] = useState("");

  const isPro = role === "profesional";
  const tone: Mode = isPro ? "pro" : "cliente";
  const onProfileStep = isPro && step === 2;

  // Si el error que vuelve del server es de un dato del paso 1, no sirve de nada
  // mostrarlo sobre el paso 2: el campo que hay que corregir no está en pantalla.
  useEffect(() => {
    if (state?.field && STEP_1_FIELDS.includes(state.field)) setStep(1);
  }, [state]);

  function elegirRol(nuevo: "cliente" | "profesional") {
    setRole(nuevo);
    setStep(1);
    setStepError(null);
  }

  /** Chequeo del paso 1 antes de pasar al perfil, con el mismo criterio que el server. */
  function continuar(form: HTMLFormElement | null) {
    if (!form) return;
    const get = (n: string) => String(new FormData(form).get(n) ?? "").trim();

    if (get("name").length < 2) return setStepError("Decinos tu nombre.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get("email"))) {
      return setStepError("Ese email no parece válido.");
    }
    if (String(new FormData(form).get("password") ?? "").length < 8) {
      return setStepError("La contraseña necesita al menos 8 caracteres.");
    }

    setStepError(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const formRef = useRef<HTMLFormElement>(null);

  return (
    // data-modo pinta el acento (foco de campos, botón, outline) desde el CSS
    // del sistema: al cambiar de lado no hay que tocar clase por clase.
    <div data-modo={tone} className="animate-page-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {onProfileStep ? "Armá tu perfil" : "Creá tu cuenta"}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {onProfileStep
              ? "Así te van a ver los clientes cuando te encuentren."
              : "Es gratis y te lleva menos de un minuto."}
          </p>
        </div>
        {isPro && (
          <span className="mt-1 shrink-0 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold text-pro-dark ring-1 ring-emerald-400/25 ring-inset">
            Paso {step} de 2
          </span>
        )}
      </div>

      <form
        ref={formRef}
        action={formAction}
        onKeyDown={(e) => {
          // En el paso 1 del alta profesional, Enter no manda el form (los campos
          // del perfil todavía están vacíos): avanza al paso siguiente.
          if (e.key === "Enter" && isPro && step === 1 && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            continuar(formRef.current);
          }
        }}
        className="glass glass-solid mt-5 space-y-6 rounded-[1.5rem] p-5 sm:p-6"
      >
        {/* El rol define de qué color es la cuenta y si se crea perfil público. */}
        <input type="hidden" name="role" value={role} />
        {next && <input type="hidden" name="next" value={next} />}

        {/* Paso 1. Se esconde con CSS en vez de desmontarse: así lo que ya
            escribiste sigue en el form y viaja igual cuando mandás el alta. */}
        <div className={step === 1 ? "space-y-6" : "hidden"}>
          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold text-slate-900">
              ¿A qué venís?
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <RoleCard
                selected={!isPro}
                onSelect={() => elegirRol("cliente")}
                tone="cliente"
                icon={<SearchIcon width={18} height={18} />}
                title="Busco"
                subtitle="Necesito un servicio"
              />
              <RoleCard
                selected={isPro}
                onSelect={() => elegirRol("profesional")}
                tone="pro"
                icon={<BriefcaseIcon width={18} height={18} />}
                title="Ofrezco"
                subtitle="Doy mis servicios"
              />
            </div>
            {/* Sacarle peso a la decisión: no es una puerta que se cierra. */}
            <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
              <SwitchIcon width={14} height={14} className="mt-0.5 shrink-0 text-slate-400" />
              <span>
                Después podés cambiar de modo cuando quieras. Solo queremos saber
                qué te interesa ahora.
              </span>
            </p>
          </fieldset>

          <div className="space-y-4">
            <Field
              id="name"
              label={isPro ? "Nombre o nombre del negocio" : "Nombre"}
              placeholder={isPro ? "Carlos López" : "María G."}
              autoComplete="name"
              value={name}
              onChange={setName}
            />

            <Field
              id="email"
              label="Email"
              type="email"
              placeholder="vos@email.com"
              autoComplete="email"
            />

            <PasswordField
              id="password"
              label="Contraseña"
              autoComplete="new-password"
              tone={tone}
              hint="Mínimo 8 caracteres."
            />
          </div>

          <div className="space-y-3">
            <FormError message={stepError ?? state?.error} />

            {isPro ? (
              <button
                type="button"
                onClick={() => continuar(formRef.current)}
                className="glass-btn w-full px-4 py-3 text-sm [--accent-dark:var(--color-pro-dark)] [--accent-rgb:5_150_105]"
              >
                Empezar a ofrecer
              </button>
            ) : (
              <SubmitButton tone="cliente" pendingLabel="Creando tu cuenta…">
                Crear cuenta
              </SubmitButton>
            )}

            {isPro && (
              <p className="text-center text-xs text-slate-400">
                En el siguiente paso cargás tu foto, tu portada y tu rubro.
              </p>
            )}

            <p className="text-center text-sm text-slate-500">
              ¿Ya tenés una?{" "}
              <Link
                href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"}
                className={`font-semibold hover:underline ${isPro ? "text-pro-dark" : "text-cliente-dark"}`}
              >
                Entrá
              </Link>
            </p>
          </div>
        </div>

        {/* Paso 2: el perfil público. Solo existe para el que ofrece servicios,
            así que se desmonta entero si vuelve a "Busco" (y con él sus required). */}
        {isPro && (
          <div className={step === 2 ? "animate-reveal-down space-y-6" : "hidden"}>
            <PerfilFotos name={name} />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="categoria" className="text-sm font-medium text-slate-700">
                  Rubro
                </label>
                <select id="categoria" name="categoria" required defaultValue="" className={FIELD}>
                  <option value="" disabled>
                    Elegí tu rubro…
                  </option>
                  {categories.filter((c) => !c.parentId).map((c) => <optgroup key={c.slug} label={`${c.icon} ${c.name}`}><option value={c.slug}>{c.name} (general)</option>{categories.filter((child) => child.parentId === c.id).map((child) => <option key={child.slug} value={child.slug}>↳ {child.name}</option>)}</optgroup>)}
                </select>
              </div>

              <Field
                id="headline"
                label="¿A qué te dedicás?"
                placeholder="Plomero matriculado"
              />

              <div className="space-y-1.5">
                <label htmlFor="zone" className="text-sm font-medium text-slate-700">Zona donde trabajás</label>
                <input id="zone" name="zone" readOnly value="Corrientes" className={`${FIELD} cursor-not-allowed bg-slate-100/70`} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="years" className="text-sm font-medium text-slate-700">
                  Años de experiencia{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  id="years"
                  name="years"
                  type="number"
                  min={0}
                  max={70}
                  placeholder="8"
                  className={FIELD}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bio" className="text-sm font-medium text-slate-700">
                  Presentación{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  maxLength={600}
                  placeholder="Contá en dos líneas qué hacés, cómo trabajás y qué te diferencia."
                  className="glass-field resize-none px-3.5 py-3 text-sm"
                />
                <p className="text-xs text-slate-400">
                  Todo esto lo podés editar después desde tu panel.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <FormError message={state?.error} />

              <SubmitButton tone="pro" pendingLabel="Creando tu perfil…">
                Crear mi perfil
              </SubmitButton>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="mx-auto flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                <ChevronLeftIcon width={16} height={16} />
                Volver a tus datos
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

/**
 * Portada + foto de perfil, montadas como se van a ver en el perfil público.
 *
 * Los inputs de archivo viajan dentro del mismo form: el server action recibe
 * los File y los guarda, que es la única forma de subir una foto cuando la
 * cuenta todavía no existe y no hay sesión para pegarle a /api/upload.
 */
function PerfilFotos({ name }: { name: string }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  function preview(
    input: HTMLInputElement,
    set: (url: string | null) => void,
    previous: string | null
  ) {
    if (previous) URL.revokeObjectURL(previous);
    const file = input.files?.[0];
    set(file ? URL.createObjectURL(file) : null);
  }

  function quitar(
    input: React.RefObject<HTMLInputElement | null>,
    set: (url: string | null) => void,
    previous: string | null
  ) {
    if (previous) URL.revokeObjectURL(previous);
    if (input.current) input.current.value = "";
    set(null);
  }

  return (
    <div className="rounded-2xl border border-pro/25 bg-emerald-400/10 p-4">
      <p className="text-sm font-bold text-pro-dark">Tus fotos</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Un perfil con foto recibe muchos más pedidos. Se pueden cambiar cuando quieras.
      </p>

      <div className="mt-4">
        {/* Portada */}
        <div className="relative">
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            className="glass relative flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl border-dashed border-white/70 text-slate-500 transition-colors hover:border-pro/45 hover:bg-white/70"
          >
            {cover ? (
              <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="flex items-center gap-2 text-xs font-medium">
                <ImageIcon width={17} height={17} />
                Agregá una foto de portada
              </span>
            )}
          </button>
          {cover && (
            <button
              type="button"
              onClick={() => quitar(coverInput, setCover, cover)}
              aria-label="Quitar la portada"
              className="absolute top-2 right-2 rounded-full bg-slate-900/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-slate-900/80"
            >
              <XIcon width={14} height={14} />
            </button>
          )}
        </div>

        {/* Foto de perfil, pisando la portada como en el perfil real */}
        <div className="-mt-8 ml-4 flex items-end gap-3">
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            aria-label="Elegir foto de perfil"
            className="group relative size-20 shrink-0 overflow-hidden rounded-full bg-pro ring-4 ring-white transition-transform hover:scale-[1.03]"
          >
            {avatar ? (
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-xl font-semibold text-white">
                {initials(name || "?")}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-slate-900/55 py-1 text-white backdrop-blur-sm">
              <CameraIcon width={15} height={15} />
            </span>
          </button>
          <div className="pb-1 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Foto de perfil</p>
            <p>Que se te vea la cara o el logo del negocio.</p>
          </div>
        </div>
      </div>

      <input
        ref={avatarInput}
        type="file"
        name="avatar"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => preview(e.currentTarget, setAvatar, avatar)}
      />
      <input
        ref={coverInput}
        type="file"
        name="cover"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => preview(e.currentTarget, setCover, cover)}
      />
    </div>
  );
}

/** Campo de texto común: label + input, con el mismo espaciado en todo el form. */
function Field({
  id,
  label,
  placeholder,
  type = "text",
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  /** Solo para los campos que otra parte del form necesita mirar (el nombre). */
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required
        placeholder={placeholder}
        className={FIELD}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
      />
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
  // Clases literales: Tailwind no ve los nombres armados por interpolación.
  const on = isPro
    ? "border-pro/60 bg-emerald-500/12 ring-2 ring-pro/25"
    : "border-cliente/60 bg-blue-500/12 ring-2 ring-cliente/25";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all ${
        selected ? on : "glass glass-card hover:bg-white/72"
      }`}
    >
      {/* El tilde confirma la elección sin depender solo del color. */}
      {selected && (
        <CheckCircleIcon
          width={18}
          height={18}
          className={`absolute top-3 right-3 ${isPro ? "text-pro" : "text-cliente"}`}
        />
      )}
      <span
        className={`inline-flex size-9 items-center justify-center rounded-xl transition-colors ${
          selected
            ? `text-white ${isPro ? "bg-pro" : "bg-cliente"}`
            : "bg-white/60 text-slate-400"
        }`}
      >
        {icon}
      </span>
      <span
        className={`mt-2.5 block text-base font-bold ${
          selected ? (isPro ? "text-pro-dark" : "text-cliente-dark") : "text-slate-700"
        }`}
      >
        {title}
      </span>
      <span className="block text-xs text-slate-500">{subtitle}</span>
    </button>
  );
}
