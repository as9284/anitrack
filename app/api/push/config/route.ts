import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The VAPID public key, read at request time rather than inlined into the
 * client bundle — setting the env var takes effect without a rebuild, and an
 * empty answer tells the UI the deployment is unconfigured (as opposed to the
 * browser lacking push support).
 */
export async function GET() {
  return NextResponse.json({
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  });
}
