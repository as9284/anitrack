import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "AniTrack — Anime tracker & seasonal guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const POSTERS = [
  "#e7e2d6",
  "#decfc2",
  "#e7e2d6",
  "#decfc2",
  "#a25a37",
  "#decfc2",
  "#e7e2d6",
  "#decfc2",
  "#e7e2d6",
];

export default async function OpengraphImage() {
  const fraunces = await readFile(
    join(process.cwd(), "app", "Fraunces-Medium.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#faf8f3",
          fontFamily: "Fraunces",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingLeft: 96,
            paddingRight: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              width: 76,
              height: 76,
              gap: 8,
              marginBottom: 40,
            }}
          >
            <div style={{ width: 34, height: 34, backgroundColor: "#1c1b18" }} />
            <div style={{ width: 34, height: 34, backgroundColor: "#a25a37" }} />
            <div style={{ width: 34, height: 34, backgroundColor: "#1c1b18" }} />
            <div style={{ width: 34, height: 34, backgroundColor: "#1c1b18" }} />
          </div>
          <div
            style={{
              fontSize: 25,
              letterSpacing: 6,
              color: "#75716a",
              marginBottom: 18,
            }}
          >
            ANIME TRACKER · SEASONAL GUIDE
          </div>
          <div style={{ fontSize: 150, color: "#1c1b18", lineHeight: 1 }}>
            AniTrack
          </div>
          <div style={{ fontSize: 40, color: "#75716a", marginTop: 20 }}>
            Track every season. Never miss an episode.
          </div>
          <div
            style={{
              width: 120,
              height: 4,
              backgroundColor: "#a25a37",
              marginTop: 34,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            width: 380,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", width: 300, gap: 12 }}>
            {POSTERS.map((color, i) => (
              <div
                key={i}
                style={{ width: 92, height: 138, backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, style: "normal", weight: 500 },
      ],
    },
  );
}
