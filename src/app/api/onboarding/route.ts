import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { cuilMatchesDni, encryptKyc, lookupKyc, normalizeDigits, parsePaymentHandle, removeKycDocument, saveKycDocument, validCuil, validDni, validPhone, videoChallengeExpiry } from "@/lib/kyc";
import { ACTIVE_JOB_STATUSES } from "@/lib/workflow";
import { slugify } from "@/lib/format";

function value(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Entrá para completar el registro." }, { status: 401 });
  if (!session.emailVerified || session.accountStatus !== "approved") return NextResponse.json({ error: "Verificá tu email antes de ofrecer servicios." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No pudimos leer el formulario." }, { status: 400 });

  const providerType = value(form, "providerType") === "profesional" ? "profesional" : "oficio";
  const legalName = value(form, "legalName");
  const phone = value(form, "phone");
  const birthDate = new Date(value(form, "birthDate"));
  const address = value(form, "address");
  const country = value(form, "country");
  const province = value(form, "province");
  const locality = value(form, "locality");
  const cuil = normalizeDigits(value(form, "cuil"));
  const dni = normalizeDigits(value(form, "dni"));
  const headline = value(form, "headline");
  const bio = value(form, "bio");
  const yearsExperience = Math.trunc(Number(value(form, "yearsExperience") || 0));
  const payment = parsePaymentHandle(value(form, "paymentHandle"));
  const categoryIds = [...new Set(form.getAll("categoryIds").map(String).filter(Boolean))];
  // Rubro propuesto por la persona cuando ninguno de la lista la representa.
  const customCategory = value(form, "customCategory").slice(0, 60);

  const legalParts = legalName.split(/\s+/).map((part) => part.replace(/[^\p{L}]/gu, ""));
  if (legalParts.length < 2 || legalParts.some((part) => part.length < 2) || address.length < 5 || !validPhone(phone) || !Number.isFinite(birthDate.getTime()) || birthDate >= new Date()) return NextResponse.json({ error: "Completá correctamente nombre, apellido y datos personales." }, { status: 422 });
  if (country !== "Argentina" || province !== "Corrientes" || locality !== "Corrientes Capital") return NextResponse.json({ error: "Seleccioná Corrientes Capital, Corrientes, Argentina." }, { status: 422 });
  if (!validCuil(cuil)) return NextResponse.json({ error: "El CUIL no es válido." }, { status: 422 });
  if (!validDni(dni)) return NextResponse.json({ error: "El DNI no es válido." }, { status: 422 });
  if (!cuilMatchesDni(cuil, dni)) return NextResponse.json({ error: "El CUIL no corresponde al DNI ingresado." }, { status: 422 });
  if (headline.length < 3 || bio.length < 20 || bio.length > 1000) return NextResponse.json({ error: "Completá actividad y descripción." }, { status: 422 });
  if (!payment) return NextResponse.json({ error: "Revisá tu dato de cobro: un CVU o CBU de 22 dígitos, o un alias." }, { status: 422 });
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 60) return NextResponse.json({ error: "Los años en el oficio tienen que estar entre 0 y 60." }, { status: 422 });
  if (customCategory && (customCategory.length < 3 || !slugify(customCategory))) return NextResponse.json({ error: "El rubro que escribiste es muy corto o no tiene letras." }, { status: 422 });
  if (!categoryIds.length && !customCategory) return NextResponse.json({ error: "Elegí al menos un rubro." }, { status: 422 });

  const avatar = form.get("avatar");
  const hasNewAvatar = avatar instanceof File && avatar.size > 0;
  if (!hasNewAvatar && !session.avatarUrl) return NextResponse.json({ error: "La foto de perfil donde se vea tu cara es obligatoria." }, { status: 422 });
  const dniFront = form.get("dni_front");
  const dniBack = form.get("dni_back");
  const identityVideo = form.get("identity_video");
  if (!(dniFront instanceof File) || !dniFront.size || !(dniBack instanceof File) || !dniBack.size || !(identityVideo instanceof File) || !identityVideo.size) return NextResponse.json({ error: "Subí DNI frente, DNI dorso y grabá el video." }, { status: 422 });
  const videoChallenge = value(form, "videoChallenge");
  const videoChallengeToken = value(form, "videoChallengeToken");
  const challengeExpiresAt = videoChallengeExpiry(session.id, videoChallenge, videoChallengeToken);
  if (!challengeExpiresAt) return NextResponse.json({ error: "La frase del video venció. Volvé a grabarlo." }, { status: 422 });

  if (session.professionalId && session.professionalStatus === "approved") {
    const activeJobs = await prisma.booking.count({ where: { professionalId: session.professionalId, status: { in: ACTIVE_JOB_STATUSES } } });
    if (activeJobs > 0) return NextResponse.json({ error: "Terminá tus trabajos activos antes de cambiar el tipo o la identidad del perfil." }, { status: 409 });
  }

  let savedDocuments: (Awaited<ReturnType<typeof saveKycDocument>> & { kind: string })[] = [];
  let committed = false;
  try {
    const validCategories = await prisma.category.findMany({ where: { id: { in: categoryIds }, kind: providerType, approvalStatus: "approved" } });
    if (validCategories.length !== categoryIds.length) return NextResponse.json({ error: "Elegí rubros compatibles con el tipo de perfil." }, { status: 422 });

    const [duplicateIdentity, previousCase] = await Promise.all([
      prisma.kycCase.findFirst({
        where: { userId: { not: session.id }, OR: [{ cuilHash: lookupKyc(cuil) }, { dniHash: lookupKyc(dni) }] },
        select: { id: true },
      }),
      prisma.kycCase.findUnique({
        where: { userId: session.id },
        select: { documents: { select: { filename: true } } },
      }),
    ]);
    if (duplicateIdentity) return NextResponse.json({ error: "El CUIL o DNI ya está registrado." }, { status: 409 });

    const avatarUrl = hasNewAvatar ? (await saveUpload(avatar as File, { imagesOnly: true })).url : session.avatarUrl!;
    savedDocuments.push({ kind: "dni_front", ...(await saveKycDocument(dniFront, "image")) });
    savedDocuments.push({ kind: "dni_back", ...(await saveKycDocument(dniBack, "image")) });
    savedDocuments.push({ kind: "identity_video", ...(await saveKycDocument(identityVideo, "video")) });

    await prisma.$transaction(async (tx) => {
      const kyc = await tx.kycCase.upsert({
        where: { userId: session.id },
        create: { userId: session.id, status: "pending", legalName, phone, birthDate, address, country, province, locality, cuilEncrypted: encryptKyc(cuil), cuilHash: lookupKyc(cuil), dniEncrypted: encryptKyc(dni), dniHash: lookupKyc(dni), profilePhotoConfirmed: true, videoChallenge, videoChallengeExpiresAt: challengeExpiresAt, submittedAt: new Date() },
        update: { status: "pending", legalName, phone, birthDate, address, country, province, locality, cuilEncrypted: encryptKyc(cuil), cuilHash: lookupKyc(cuil), dniEncrypted: encryptKyc(dni), dniHash: lookupKyc(dni), profilePhotoConfirmed: true, videoChallenge, videoChallengeExpiresAt: challengeExpiresAt, submittedAt: new Date(), reviewReason: null, reviewedAt: null, reviewedBy: null },
      });
      await tx.kycDocument.deleteMany({ where: { kycCaseId: kyc.id } });
      await tx.kycDocument.createMany({ data: savedDocuments.map((document) => ({ ...document, kycCaseId: kyc.id })) });

      /* El rubro escrito a mano nace pendiente y a nombre de quien lo propuso:
         administración lo aprueba junto con el KYC (`reviewKycAction`). Si el
         slug ya existe se reusa esa fila, para no llenar el catálogo de
         duplicados con distinta ortografía. */
      const linkedCategoryIds = validCategories.map((category) => category.id);
      if (customCategory) {
        const slug = slugify(customCategory);
        const category = await tx.category.findUnique({ where: { slug }, select: { id: true } })
          ?? await tx.category.create({ data: { name: customCategory, slug, icon: "🛠️", kind: providerType, approvalStatus: "pending", createdByUserId: session.id } });
        if (!linkedCategoryIds.includes(category.id)) linkedCategoryIds.push(category.id);
      }
      const professional = await tx.professional.upsert({
        where: { userId: session.id },
        create: { userId: session.id, name: legalName, headline, bio, zone: "Corrientes Capital, Corrientes", address, priceFrom: 0, categoryId: linkedCategoryIds[0], avatarUrl, avatarColor: "#059669", profileStatus: "pending", verified: false, providerType, paymentHandle: payment.handle, paymentHandleKind: payment.kind, phone, yearsExperience },
        update: { name: legalName, headline, bio, zone: "Corrientes Capital, Corrientes", address, categoryId: linkedCategoryIds[0], avatarUrl, profileStatus: "pending", verified: false, providerType, paymentHandle: payment.handle, paymentHandleKind: payment.kind, phone, yearsExperience },
      });
      await tx.professionalCategory.deleteMany({ where: { professionalId: professional.id } });
      await tx.professionalCategory.createMany({ data: linkedCategoryIds.map((categoryId, index) => ({ professionalId: professional.id, categoryId, isPrimary: index === 0 })) });
      await tx.user.update({ where: { id: session.id }, data: { name: legalName, avatarUrl } });
    });
    committed = true;
    await Promise.all(previousCase?.documents.map((document) => removeKycDocument(document.filename)) ?? []);
    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    if (!committed) await Promise.all(savedDocuments.map((document) => removeKycDocument(document.filename)));
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "El CUIL o DNI ya está registrado." }, { status: 409 });
    console.error("[onboarding]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No pudimos enviar la verificación." }, { status: 500 });
  }
}
