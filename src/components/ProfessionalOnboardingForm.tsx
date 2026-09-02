"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ProviderType = "profesional" | "oficio";
type Category = { id: string; name: string; icon: string; kind: string; parent: { name: string } | null };
type Initial = {
  name: string; email: string; avatarUrl: string | null; providerType?: ProviderType; status?: string; reason?: string | null;
  categoryIds?: string[]; headline?: string; bio?: string; paymentAlias?: string; paymentCvu?: string;
  legalName?: string; phone?: string; birthDate?: string; cuil?: string; dni?: string; address?: string;
};

const FIELD = "glass-field mt-1 w-full px-3 py-2.5 text-sm";

export function ProfessionalOnboardingForm({ categories, initial }: { categories: Category[]; initial: Initial }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [providerType, setProviderType] = useState<ProviderType>(initial.providerType || "oficio");
  const [categoryIds, setCategoryIds] = useState<string[]>(initial.categoryIds ?? []);
  const [values, setValues] = useState({
    headline: initial.headline ?? "", bio: initial.bio ?? "", paymentAlias: initial.paymentAlias ?? "", paymentCvu: initial.paymentCvu ?? "", legalName: initial.legalName ?? initial.name,
    phone: initial.phone ?? "", birthDate: initial.birthDate ?? "", cuil: initial.cuil ?? "", dni: initial.dni ?? "", address: initial.address ?? "",
  });
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
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setCategoryIds((current) => current.filter((id) => compatibleCategories.some((category) => category.id === id)));
  }, [compatibleCategories]);

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
    if (step === 1 && (!values.headline.trim() || values.bio.trim().length < 20 || categoryIds.length === 0)) return "Completá actividad, descripción y al menos un rubro.";
    if (step === 1 && values.paymentAlias.trim().length < 6) return "Ingresá un alias de cobro válido.";
    if (step === 1 && values.paymentCvu.replace(/\D/g, "").length !== 22) return "El CVU debe tener 22 dígitos.";
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
    form.set("providerType", providerType); form.set("country", "Argentina"); form.set("province", "Corrientes"); form.set("locality", "Corrientes Capital");
    categoryIds.forEach((id) => form.append("categoryIds", id));
    if (avatar) form.set("avatar", avatar); else form.set("confirmProfilePhoto", "yes");
    form.set("dni_front", dniFront!); form.set("dni_back", dniBack!); form.set("identity_video", video!);
    form.set("videoChallenge", challenge); form.set("videoChallengeToken", challengeToken);
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
        <label className="block text-sm font-medium">¿A qué te dedicás?<input value={values.headline} onChange={(e) => update("headline", e.target.value)} maxLength={100} placeholder="Ej: Plomero matriculado" className={FIELD} /></label>
        <label className="block text-sm font-medium">Descripción de los trabajos que ofrecés<textarea value={values.bio} onChange={(e) => update("bio", e.target.value)} minLength={20} maxLength={1000} rows={4} placeholder="Contá qué trabajos hacés, cómo trabajás y qué te diferencia." className={`${FIELD} resize-none`} /></label>
        <fieldset><legend className="text-sm font-semibold">Rubros de {providerType}</legend><div className="mt-2 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">{compatibleCategories.map((category) => <label key={category.id} className="rounded-xl bg-white/70 p-3 text-sm"><input type="checkbox" checked={categoryIds.includes(category.id)} onChange={(e) => setCategoryIds((current) => e.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} className="mr-2" />{category.icon} {category.parent ? `${category.parent.name} · ` : ""}{category.name}</label>)}</div></fieldset>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Alias de cobro<input value={values.paymentAlias} onChange={(e) => update("paymentAlias", e.target.value)} placeholder="nombre.alias" className={FIELD} /></label><label className="text-sm font-medium">CVU<input value={values.paymentCvu} onChange={(e) => update("paymentCvu", e.target.value.replace(/\D/g, "").slice(0, 22))} inputMode="numeric" placeholder="22 dígitos" className={FIELD} /></label></div>
      </>}
      {step === 2 && <>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nombre legal<input value={values.legalName} onChange={(e) => update("legalName", e.target.value)} className={FIELD} /></label><label className="text-sm font-medium">Email verificado<input value={initial.email} disabled className={`${FIELD} opacity-70`} /></label><label className="text-sm font-medium">Teléfono<input value={values.phone} onChange={(e) => update("phone", e.target.value)} type="tel" className={FIELD} /></label><label className="text-sm font-medium">Fecha de nacimiento<input value={values.birthDate} onChange={(e) => update("birthDate", e.target.value)} type="date" className={FIELD} /></label><label className="text-sm font-medium">CUIL<input value={values.cuil} onChange={(e) => update("cuil", e.target.value)} inputMode="numeric" placeholder="20-12345678-6" className={FIELD} /></label><label className="text-sm font-medium">DNI<input value={values.dni} onChange={(e) => update("dni", e.target.value)} inputMode="numeric" className={FIELD} /></label><label className="text-sm font-medium sm:col-span-2">Domicilio<input value={values.address} onChange={(e) => update("address", e.target.value)} className={FIELD} /></label></div>
        <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-medium">País<select value="Argentina" disabled className={FIELD}><option>Argentina</option></select></label><label className="text-sm font-medium">Provincia<select value="Corrientes" disabled className={FIELD}><option>Corrientes</option></select></label><label className="text-sm font-medium">Localidad<select value="Corrientes Capital" disabled className={FIELD}><option>Corrientes Capital</option></select></label></div>
      </>}
      {step === 3 && <>
        <p className="text-sm text-slate-600">Los documentos y el video son privados: solo administración puede verlos.</p>
        <div className="grid gap-4 sm:grid-cols-3"><FileField label="Foto de perfil" accept="image/jpeg,image/png,image/webp" current={initial.avatarUrl ? "Foto actual disponible" : null} onChange={setAvatar} /><FileField label="DNI frente" accept="image/jpeg,image/png,image/webp" onChange={setDniFront} /><FileField label="DNI dorso" accept="image/jpeg,image/png,image/webp" onChange={setDniBack} /></div>
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><h2 className="font-bold text-slate-900">Video de identidad</h2><p className="mt-1 text-sm text-slate-600">Mostrá tu cara y el DNI, y leé en voz alta la frase que aparece. Máximo 30 segundos.</p>{challenge && <p className="mt-3 rounded-xl bg-white p-3 text-center text-lg font-black tracking-wide text-pro-dark">{challenge}</p>}<video ref={liveVideoRef} autoPlay muted playsInline className={`${recording ? "block" : "hidden"} mt-3 max-h-72 w-full scale-x-[-1] rounded-xl bg-black`} /><div className="mt-3 flex flex-wrap gap-2">{recording ? <button type="button" onClick={stopRecording} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Detener ({seconds}s)</button> : <button type="button" onClick={startRecording} className="glass-btn px-4 py-2 text-sm">{video ? "Volver a grabar" : "Grabar video"}</button>}</div>{videoUrl && !recording && <video src={videoUrl} controls playsInline className="mt-3 max-h-72 w-full rounded-xl bg-black" />}</section>
      </>}
      {step === 4 && <section className="space-y-3"><h2 className="text-xl font-bold text-slate-900">Revisá antes de enviar</h2><dl className="grid gap-3 text-sm sm:grid-cols-2"><Summary label="Tipo" value={providerType} /><Summary label="Actividad" value={values.headline} /><Summary label="Rubros" value={String(categoryIds.length)} /><Summary label="Ubicación" value="Corrientes Capital, Corrientes, Argentina" /><Summary label="Cobro" value={`${values.paymentAlias} · CVU terminado en ${values.paymentCvu.slice(-4)}`} /><Summary label="Identidad" value="DNI frente, dorso y video listos" /></dl><p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">El perfil quedará pendiente hasta que administración revise la documentación.</p></section>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><div className="flex gap-2"><Link href="/" className="glass-btn glass-btn-ghost px-4 py-2.5 text-sm">Volver a Busco</Link>{step > 1 && <button type="button" onClick={() => { setError(null); setStep((current) => current - 1); }} className="glass-btn glass-btn-ghost px-4 py-2.5 text-sm">Atrás</button>}</div>{step < 4 ? <button type="button" onClick={next} className="glass-btn px-5 py-2.5 text-sm">Continuar</button> : <button type="button" disabled={busy} onClick={submit} className="glass-btn px-5 py-2.5 text-sm disabled:opacity-60">{busy ? "Enviando…" : "Enviar para aprobación"}</button>}</div>
    </div>
  </div>;
}

function FileField({ label, accept, current, onChange }: { label: string; accept: string; current?: string | null; onChange: (file: File | null) => void }) {
  const [name, setName] = useState(current || "Sin archivo");
  return <label className="rounded-xl bg-white/70 p-3 text-sm font-medium">{label}<input type="file" accept={accept} onChange={(e) => { const file = e.target.files?.[0] || null; onChange(file); setName(file?.name || current || "Sin archivo"); }} className="mt-2 block w-full text-xs" /><span className="mt-1 block truncate text-xs font-normal text-slate-500">{name}</span></label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/70 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-800">{value}</dd></div>;
}
