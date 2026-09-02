import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Completá el alta y el KYC desde /pro." }, { status: 410 });
}
