import { NextResponse } from "next/server";
import { importFromAniList } from "@/lib/anilist";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = (searchParams.get("user") ?? "").trim();

  if (!user || user.length > 50) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    const entries = await importFromAniList(user);
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json(
      { error: "Couldn't fetch that AniList user." },
      { status: 404 },
    );
  }
}
