import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AniTrack — Anime tracker",
    short_name: "AniTrack",
    description:
      "Track upcoming anime episodes, browse seasonal charts, and never miss a release.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f3",
    theme_color: "#a25a37",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
