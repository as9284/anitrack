export const revalidate = 21600;

import { NextResponse } from "next/server";
import { getMedia } from "@/lib/anilist";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mediaId = parseInt(id, 10);

  if (!Number.isFinite(mediaId) || mediaId <= 0) {
    return NextResponse.json({ media: null }, { status: 400 });
  }

  const media = await getMedia(mediaId);
  if (!media) {
    return NextResponse.json({ media: null }, { status: 404 });
  }

  return NextResponse.json({ media });
}
