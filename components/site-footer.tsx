export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-page px-5 py-8 text-center text-xs text-muted sm:px-6">
        <p>
          Data from{" "}
          <a
            href="https://anilist.co"
            target="_blank"
            rel="noreferrer"
            className="text-ink underline-offset-2 hover:underline"
          >
            AniList
          </a>
          . Tracking stays on your device.
        </p>
      </div>
    </footer>
  );
}
