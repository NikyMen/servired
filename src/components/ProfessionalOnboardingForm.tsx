"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

type ProviderType = "profesional" | "oficio";
type Category = { id: string; name: string; icon: string; kind: string; parent: { name: string } | null };
type Locality = { id: string; name: string; province: string };
type Initial = {
  name: string; email: string; avatarUrl: string | null; providerType?: ProviderType; status?: string; reason?: string | null;
  categoryIds?: string[]; headline?: string; bio?: string; yearsExperience?: number;
  legalName?: string; phone?: string; birthDate?: string; cuil?: string; dni?: string; address?: string; localityId?: string | null;
  ofertasDependencia?: boolean;
};

const FIELD = "glass-field mt-1 w-full px-3 py-2.5 text-sm";

export function ProfessionalOnboardingForm({ categories, localities, initial }: { categories: Category[]; localities: Locality[]; initial: Initial }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [providerType, setProviderType] = useState<ProviderType>(initial.providerType || "oficio");
  const [categoryIds, setCategoryIds] = useState<string[]>(initial.categoryIds ?? []);
  /* El oficio sale de una lista para que no haya cuarenta formas de escribir
     "electricista". "otra" abre el campo libre y propone un rubro nuevo. */
  const [oficio, setOficio] = useState<string>(() => {
    const elegido = categories.find((category) => category.name === initial.headline);
    return elegido ? elegido.id : initial.headline ? "otra" : "";
  });
  const [values, setValues] = useState({
    headline: initial.headline ?? "", bio: initial.bio ?? "", yearsExperience: String(initial.yearsExperience ?? 0), legalName: initial.legalName ?? initial.name,
    phone: initial.phone ?? "", birthDate: initial.birthDate ?? "", cuil: initial.cuil ?? "", dni: initial.dni ?? "", address: initial.address ?? "",
    // La primera de la lista es Capital: ahí se dio de alta todo el mundo hasta ahora.
    localityId: initial.localityId ?? localities[0]?.id ?? "",
  });
  const [ofertasDependencia, setOfertasDependencia] = useState(initial.ofertasDependencia ?? false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [dniFront, setDniFront] = useState<File | null>(null);
  const [dniBack, setDniBack] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [challenge, setChallenge] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftKey = `servired-provider-draft:${initial.email}`;

  const compatibleCategories = useMemo(() => categories.filter((category) => category.kind === providerType), [categories, providerType]);
  const groupedCategories = useMemo(() => {
    const groups = new Map<string, Category[]>();
    for (const category of compatibleCategories) {
      const name = category.parent?.name ?? "Otros servicios";
      groups.set(name, [...(groups.get(name) ?? []), category]);
    }
    return [...groups.entries()];
  }, [compatibleCategories]);
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const selectedLocality = localities.find((locality) => locality.id === values.localityId);

  useEffect(() => {
    setCategoryIds((current) => current.filter((id) => compatibleCategories.some((category) => category.id === id)));
    setOficio((current) => (current === "otra" || compatibleCategories.some((category) => category.id === current) ? current : ""));
  }, [compatibleCategories]);

  function elegirOficio(value: string) {
    setOficio(value);
    if (value === "otra") return update("headline", "");
    const category = compatibleCategories.find((item) => item.id === value);
    if (!category) return update("headline", "");
    update("headline", category.name);
    setCategoryIds((current) => (current.includes(category.id) ? current : [...current, category.id]));
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as { values?: Partial<typeof values>; providerType?: ProviderType; categoryIds?: string[] };
        if (draft.values) setValues((current) => ({ ...current, headline: current.headline || draft.values?.headline || "", bio: current.bio || draft.values?.bio || "" }));
        if (!initial.providerType && (draft.providerType === "profesional" || draft.providerType === "oficio")) setProviderType(draft.providerType);
        if (!initial.categoryIds?.length && Array.isArray(draft.categoryIds)) setCategoryIds(draft.categoryIds.filter((id) => typeof id === "string"));
      }
    } catch { /* Un borrador inválido no debe bloquear el alta. */ }
    setDraftReady(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady) return;
    localStorage.setItem(draftKey, JSON.stringify({ values: { headline: values.headline, bio: values.bio }, providerType, categoryIds }));
  }, [draftReady, draftKey, values, providerType, categoryIds]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  function validateStep() {
    if (step === 1 && (!values.headline.trim() || values.bio.trim().length < 20)) return "Completá a qué te dedicás y la descripción.";
    if (step === 1 && oficio === "otra" && values.headline.trim().length < 3) return "Escribí a qué te dedicás.";
    if (step === 1 && categoryIds.length === 0 && oficio !== "otra") return "Elegí al menos un rubro.";
    const legalParts = values.legalName.trim().split(/\s+/).map((part) => part.replace(/[^\p{L}]/gu, ""));
    if (step === 2 && (legalParts.length < 2 || legalParts.some((part) => part.length < 2) || values.phone.replace(/\D/g, "").length < 8 || !values.birthDate || values.address.trim().length < 5)) return "Ingresá nombre y apellido completos y revisá tus datos personales.";
    if (step === 2 && values.cuil.replace(/\D/g, "").length !== 11) return "El CUIL debe tener 11 dígitos.";
    if (step === 2 && !/^\d{7,8}$/.test(values.dni.replace(/\D/g, ""))) return "Ingresá un DNI válido.";
    if (step === 3 && !initial.avatarUrl && !avatar) return "Subí una foto de perfil donde se vea tu cara.";
    if (step === 3 && (!dniFront || !dniBack || !video || !challengeToken)) return "Completá las dos fotos del DNI y el video guiado.";
    return null;
  }

  function next() {
    const issue = validateStep();
    if (issue) return setError(issue);
    setError(null); setStep((current) => Math.min(4, current + 1)); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setError("Este navegador no permite grabar video. Probá con Chrome, Edge o Safari actualizado.");
    setError(null); setVideo(null); setSeconds(0);
    try {
      const challengeResponse = await fetch("/api/kyc/video-challenge", { method: "POST" });
      const challengeData = await challengeResponse.json().catch(() => ({}));
      if (!challengeResponse.ok) throw new Error(challengeData.error || "No pudimos generar la frase.");
      setChallenge(challengeData.challenge); setChallengeToken(challengeData.token);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 } }, audio: true });
      streamRef.current = stream;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
      const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType.includes("mp4") ? "video/mp4" : "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideo(new File([blob], `identidad.${type === "video/mp4" ? "mp4" : "webm"}`, { type }));
        setVideoUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop()); streamRef.current = null;
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      };
      recorder.start(500); setRecording(true);
      timerRef.current = setInterval(() => setSeconds((current) => {
        if (current >= 29) { stopRecording(); return 30; }
        return current + 1;
      }), 1000);
    } catch (reason) {
      streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      setError(reason instanceof Error ? reason.message : "No pudimos acceder a cámara y micrófono.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; setRecording(false);
  }

  async function submit() {
    setBusy(true); setError(null);
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.set(key, value));
    form.set("providerType", providerType);
    form.set("ofertasDependencia", ofertasDependencia ? "on" : "");
    categoryIds.forEach((id) => form.append("categoryIds", id));
    if (avatar) form.set("avatar", avatar); else form.set("confirmProfilePhoto", "yes");
    form.set("dni_front", dniFront!); form.set("dni_back", dniBack!); form.set("identity_video", video!);
    form.set("videoChallenge", challenge); form.set("videoChallengeToken", challengeToken);
    form.set("customCategory", oficio === "otra" ? values.headline.trim() : "");
    const response = await fetch("/api/onboarding", { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || "No pudimos enviar la verificación.");
    else { localStorage.removeItem(draftKey); router.refresh(); }
    setBusy(false);
  }

  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Activá tu perfil en Ofrezco</h1><p className="mt-1 text-sm text-slate-500">Podés volver a Busco: guardamos rubros y descripción; los datos sensibles y archivos no quedan en el navegador.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-pro-dark">Paso {step} de 4</span></div>
    {initial.reason && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><strong>Cambios solicitados:</strong> {initial.reason}</p>}
    <div className="glass glass-solid space-y-5 rounded-2xl p-5 sm:p-6">
      {step === 1 && <>
        <fieldset><legend className="text-sm font-semibold text-slate-900">Tipo de perfil</legend><div className="mt-2 grid grid-cols-2 gap-3">{(["profesional", "oficio"] as const).map((type) => <button key={type} type="button" onClick={() => setProviderType(type)} className={`rounded-2xl border p-4 text-left capitalize ${providerType === type ? "border-pro bg-emerald-50 font-bold text-pro-dark" : "border-slate-200 bg-white/60 text-slate-600"}`}>{type}</button>)}</div></fieldset>
        <label className="block text-sm font-medium">¿A qué te dedicás?
          <select value={oficio} onChange={(e) => elegirOficio(e.target.value)} className={FIELD}>
            <option value="">Elegí de la lista</option>
            {groupedCategories.map(([group, items]) => <optgroup key={group} label={group}>{items.map((category) => <option key={category.id} value={category.id}>{category.icon} {category.name}</option>)}</optgroup>)}
            <option value="otra">Otra (la escribo yo)</option>
          </select>
          {oficio === "otra" && <input value={values.headline} onChange={(e) => update("headline", e.target.value)} maxLength={60} placeholder="Ej: Restaurador de muebles" className={FIELD} />}
          <span className="mt-1 block text-xs font-normal text-slate-500">{oficio === "otra" ? "Administración la revisa junto con tu verificación y queda como rubro nuevo del catálogo." : "Elegirlo de la lista te deja mejor ubicado en las búsquedas."}</span>
        </label>
        <label className="block text-sm font-medium">Años en el oficio
          <input value={values.yearsExperience} onChange={(e) => update("yearsExperience", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="0" className={FIELD} />
          <span className="mt-1 block text-xs font-normal text-slate-500">Los que llevás trabajando, dentro y fuera de ServiRed. Se muestra aparte de tu antigüedad en la plataforma.</span>
        </label>
        <label className="block text-sm font-medium">Descripción de los trabajos que ofrecés<textarea value={values.bio} onChange={(e) => update("bio", e.target.value)} minLength={20} maxLength={1000} rows={4} placeholder="Contá qué trabajos hacés, cómo trabajás y qué te diferencia." className={`${FIELD} resize-none`} /></label>
        <fieldset><legend className="text-sm font-semibold">Rubros de {providerType}</legend><div className="mt-2 max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-white/40 p-3">{groupedCategories.map(([group, items]) => <section key={group}><h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{group}</h3><div className="grid gap-2 sm:grid-cols-2">{items.map((category) => <label key={category.id} className="rounded-xl bg-white/80 p-3 text-sm"><input type="checkbox" checked={categoryIds.includes(category.id)} onChange={(e) => setCategoryIds((current) => e.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} className="mr-2" />{category.icon} {category.name}</label>)}</div></section>)}</div></fieldset>
        <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Cuando aprueben tu perfil, vinculá tu cuenta de Mercado Pago desde Mi perfil para cobrar tus trabajos.</p>
      </>}
      {step === 2 && <>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nombre legal<input value={values.legalName} onChange={(e) => update("legalName", e.target.value)} className={FIELD} /></label><label className="text-sm font-medium">Email verificado<input value={initial.email} disabled className={`${FIELD} opacity-70`} /></label><label className="text-sm font-medium">Teléfono<input value={values.phone} onChange={(e) => update("phone", e.target.value)} type="tel" className={FIELD} /></label><label className="text-sm font-medium">Fecha de nacimiento<input value={values.birthDate} onChange={(e) => update("birthDate", e.target.value)} type="date" className={FIELD} /></label><label className="text-sm font-medium">CUIL<input value={values.cuil} onChange={(e) => update("cuil", e.target.value)} inputMode="numeric" placeholder="20-12345678-6" className={FIELD} /></label><label className="text-sm font-medium">DNI<input value={values.dni} onChange={(e) => update("dni", e.target.value)} inputMode="numeric" className={FIELD} /></label><label className="text-sm font-medium sm:col-span-2">Domicilio<input value={values.address} onChange={(e) => update("address", e.target.value)} className={FIELD} /></label></div>
        <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-medium">Localidad<select value={values.localityId} onChange={(e) => update("localityId", e.target.value)} required className={FIELD}>{!localities.length && <option value="">No pudimos cargar las localidades</option>}{localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label className="text-sm font-medium">Provincia<input value={selectedLocality?.province ?? ""} disabled className={`${FIELD} opacity-70`} /></label><label className="text-sm font-medium">País<input value="Argentina" disabled className={`${FIELD} opacity-70`} /></label></div>
      </>}
      {step === 3 && <>
        <p className="text-sm text-slate-600">Los documentos y el video son privados: solo administración puede verlos.</p>
        <div className="grid gap-4 sm:grid-cols-3"><FileField label="Foto de perfil" accept="image/jpeg,image/png,image/webp" capture="user" current={initial.avatarUrl ? "Ya tenés una foto cargada" : null} onChange={setAvatar} /><FileField label="DNI frente" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={setDniFront} /><FileField label="DNI dorso" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={setDniBack} /></div>
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><h2 className="font-bold text-slate-900">Video de identidad</h2><p className="mt-1 text-sm text-slate-600">Mostrá tu cara y el DNI, y leé en voz alta la frase que aparece. Máximo 30 segundos.</p>{challenge && <p className="mt-3 rounded-xl bg-white p-4 text-center text-base leading-relaxed font-bold text-pro-dark sm:text-lg">{challenge}</p>}<video ref={liveVideoRef} autoPlay muted playsInline className={`${recording ? "block" : "hidden"} mt-3 max-h-72 w-full scale-x-[-1] rounded-xl bg-black`} /><div className="mt-3 flex flex-wrap gap-2">{recording ? <button type="button" onClick={stopRecording} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Detener ({seconds}s)</button> : <button type="button" onClick={startRecording} className="glass-btn px-4 py-2 text-sm">{video ? "Volver a grabar" : "Grabar video"}</button>}</div>{videoUrl && !recording && <video src={videoUrl} controls playsInline className="mt-3 max-h-72 w-full rounded-xl bg-black" />}</section>
      </>}
      {step === 4 && <section className="space-y-3"><h2 className="text-xl font-bold text-slate-900">Revisá antes de enviar</h2><dl className="grid gap-3 text-sm sm:grid-cols-2"><Summary label="Tipo" value={providerType} /><Summary label="Actividad" value={values.headline} /><Summary label="Rubros" value={String(categoryIds.length)} /><Summary label="Años en el oficio" value={values.yearsExperience || "0"} /><Summary label="Ubicación" value="Corrientes Capital, Corrientes, Argentina" /><Summary label="Cobro" value="Mercado Pago: se vincula después de la aprobación" /><Summary label="Localidad" value={selectedLocality ? `${selectedLocality.name}, ${selectedLocality.province}` : "—"} /><Summary label="Identidad" value="DNI frente, dorso y video listos" /></dl><label className="flex items-start gap-3 rounded-xl bg-white/70 p-3 text-sm text-slate-700"><input type="checkbox" checked={ofertasDependencia} onChange={(e) => setOfertasDependencia(e.target.checked)} className="mt-0.5 size-5 shrink-0" /><span>Me gustaría recibir ofertas por privado en relación de dependencia.</span></label><p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">El perfil quedará pendiente hasta que administración revise la documentación.</p></section>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><div className="flex gap-2"><Link href="/" className="glass-btn glass-btn-ghost px-4 py-2.5 text-sm">Volver a Busco</Link>{step > 1 && <button type="button" onClick={() => { setError(null); setStep((current) => current - 1); }} className="glass-btn glass-btn-ghost px-4 py-2.5 text-sm">Atrás</button>}</div>{step < 4 ? <button type="button" onClick={next} className="glass-btn px-5 py-2.5 text-sm">Continuar</button> : <button type="button" disabled={busy} onClick={submit} className="glass-btn px-5 py-2.5 text-sm disabled:opacity-60">{busy ? "Enviando…" : "Enviar para aprobación"}</button>}</div>
    </div>
  </div>;
}

/* Dos botones en vez del input nativo ("Seleccionar archivo Sin arc…nados"):
   uno abre la cámara directo (capture) y el otro la galería. */
function FileField({ label, accept, capture, current, onChange }: { label: string; accept: string; capture: "user" | "environment"; current?: string | null; onChange: (file: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] || null;
    e.target.value = "";
    if (!picked) return;
    setFile(picked); onChange(picked);
    setPreview(URL.createObjectURL(picked));
  }

  return <div className="flex flex-col rounded-2xl bg-white/70 p-3 text-sm">
    <p className="font-semibold text-slate-900">{label}</p>
    <div className="mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60">
      {preview ? <img src={preview} alt={label} className="size-full object-cover" /> : <span className="px-3 text-center text-xs text-slate-500">{current || "Todavía no cargaste la foto"}</span>}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" onClick={() => cameraRef.current?.click()} className="glass-btn flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
        Sacar foto
      </button>
      <button type="button" onClick={() => galleryRef.current?.click()} className="glass-btn glass-btn-ghost flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>
        Galería
      </button>
    </div>
    <input ref={cameraRef} type="file" accept={accept} capture={capture} onChange={pick} className="hidden" />
    <input ref={galleryRef} type="file" accept={accept} onChange={pick} className="hidden" />
    {file && <span className="mt-2 block truncate text-xs text-emerald-700">✓ Foto cargada</span>}
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/70 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-800">{value}</dd></div>;
}
