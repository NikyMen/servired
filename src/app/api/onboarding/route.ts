import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { cuilMatchesDni, encryptKyc, lookupKyc, normalizeDigits, removeKycDocument, saveKycDocument, validCuil, validCvu, validDni, validPhone, videoChallengeExpiry } from "@/lib/kyc";
import { ACTIVE_JOB_STATUSES } from "@/lib/workflow";

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
  const paymentAlias = value(form, "paymentAlias");
  const paymentCvu = normalizeDigits(value(form, "paymentCvu"));
  const categoryIds = [...new Set(form.getAll("categoryIds").map(String).filter(Boolean))];

  const legalParts = legalName.split(/\s+/).map((part) => part.replace(/[^\p{L}]/gu, ""));
  if (legalParts.length < 2 || legalParts.some((part) => part.length < 2) || address.length < 5 || !validPhone(phone) || !Number.isFinite(birthDate.getTime()) || birthDate >= new Date()) return NextResponse.json({ error: "Completá correctamente nombre, apellido y datos personales." }, { status: 422 });
  if (country !== "Argentina" || province !== "Corrientes" || locality !== "Corrientes Capital") return NextResponse.json({ error: "Seleccioná Corrientes Capital, Corrientes, Argentina." }, { status: 422 });
  if (!validCuil(cuil)) return NextResponse.json({ error: "El CUIL no es válido." }, { status: 422 });
  if (!validDni(dni)) return NextResponse.json({ error: "El DNI no es válido." }, { status: 422 });
  if (!cuilMatchesDni(cuil, dni)) return NextResponse.json({ error: "El CUIL no corresponde al DNI ingresado." }, { status: 422 });
  if (headline.length < 3 || bio.length < 20 || bio.length > 1000 || paymentAlias.length < 6 || paymentAlias.length > 80) return NextResponse.json({ error: "Completá actividad, descripción y alias de cobro." }, { status: 422 });
  if (!validCvu(paymentCvu)) return NextResponse.json({ error: "El CVU no es válido." }, { status: 422 });
  if (!categoryIds.length) return NextResponse.json({ error: "Elegí al menos un rubro." }, { status: 422 });

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
      const professional = await tx.professional.upsert({
        where: { userId: session.id },
        create: { userId: session.id, name: legalName, headline, bio, zone: "Corrientes Capital, Corrientes", address, priceFrom: 0, categoryId: validCategories[0].id, avatarUrl, avatarColor: "#059669", profileStatus: "pending", verified: false, providerType, paymentAlias, paymentCvu },
        update: { name: legalName, headline, bio, zone: "Corrientes Capital, Corrientes", address, categoryId: validCategories[0].id, avatarUrl, profileStatus: "pending", verified: false, providerType, paymentAlias, paymentCvu },
      });
      await tx.professionalCategory.deleteMany({ where: { professionalId: professional.id } });
      await tx.professionalCategory.createMany({ data: validCategories.map((category, index) => ({ professionalId: professional.id, categoryId: category.id, isPrimary: index === 0 })) });
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
