"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useStore, type PersistedState } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { readAdultCookie, setAdultCookie, subscribeAdult } from "@/lib/adult";
import { Checkbox } from "@/components/ui/checkbox";
import type { ImportEntry } from "@/lib/types";

function generateCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `${part()}-${part()}-${part()}`;
}

export default function SettingsPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const syncCode = useStore((s) => s.syncCode);
  const setSyncCode = useStore((s) => s.setSyncCode);
  const exportState = useStore((s) => s.exportState);
  const replaceAll = useStore((s) => s.replaceAll);
  const importEntries = useStore((s) => s.importEntries);

  const allowAdult = useSyncExternalStore(
    subscribeAdult,
    readAdultCookie,
    () => false,
  );
  const [codeInput, setCodeInput] = useState("");
  const [importUser, setImportUser] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const runImport = async () => {
    const user = importUser.trim();
    if (!user) {
      setMessage("Enter an AniList username.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/import?user=${encodeURIComponent(user)}`);
      if (!res.ok) {
        setMessage("Couldn't find that AniList user.");
        return;
      }
      const data = (await res.json()) as { entries: ImportEntry[] };
      if (!data.entries || data.entries.length === 0) {
        setMessage("That list looks empty or private.");
        return;
      }
      importEntries(data.entries);
      setImportUser("");
      setMessage(`Imported ${data.entries.length} titles from AniList.`);
    } catch {
      setMessage("Import failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggleAdult = (next: boolean) => {
    setAdultCookie(next);
    router.refresh();
  };

  const push = async (code: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const payload = { ...exportState(), syncCode: code };
      const res = await fetch(`/api/sync/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setMessage("Saved to the cloud.");
    } catch {
      setMessage("Sync failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const enableSync = async () => {
    const code = generateCode();
    setSyncCode(code);
    await push(code);
  };

  const pull = async () => {
    const code = codeInput.trim().toLowerCase();
    if (!/^[a-z0-9-]{6,40}$/.test(code)) {
      setMessage("That code doesn't look right.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sync/${code}`);
      if (res.status === 404) {
        setMessage("No data found for that code.");
        return;
      }
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { data: PersistedState };
      replaceAll({ ...body.data, syncCode: code });
      setCodeInput("");
      setMessage("Pulled your list from the cloud.");
    } catch {
      setMessage("Couldn't pull that code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const disableSync = () => {
    setSyncCode(null);
    setMessage("Sync disabled on this device.");
  };

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(exportState(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anitrack-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as PersistedState;
      if (typeof parsed !== "object" || !parsed.entries) throw new Error();
      replaceAll(parsed);
      setMessage("Imported your backup.");
    } catch {
      setMessage("That file couldn't be read.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const themes = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <div className="max-w-2xl py-10">
      <p className="kicker">Preferences</p>
      <h1 className="mb-8 mt-3 font-serif text-4xl text-ink">Settings</h1>

      <section className="border-t border-line py-7">
        <h2 className="font-serif text-xl text-ink">Appearance</h2>
        <p className="mt-1 text-sm text-muted">Choose your color theme.</p>
        <div className="mt-4 flex gap-2">
          {themes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`border px-4 py-2 text-sm transition-colors ${
                hydrated && theme === t.value
                  ? "border-accent bg-accent text-white"
                  : "border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-line py-7">
        <h2 className="font-serif text-xl text-ink">Content</h2>
        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="text-sm text-muted">
            Show adult (18+) titles. Off by default.
          </span>
          <Checkbox
            ariaLabel="Show adult titles"
            checked={allowAdult}
            onCheckedChange={toggleAdult}
          />
        </div>
      </section>

      <section className="border-t border-line py-7">
        <h2 className="font-serif text-xl text-ink">Import</h2>
        <p className="mt-1 text-sm text-muted">
          Bring your existing list over from an AniList username. Your statuses
          and episode progress come with it.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={importUser}
            onChange={(e) => setImportUser(e.target.value)}
            placeholder="AniList username"
            className="flex-1 border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
          <button
            type="button"
            disabled={busy}
            onClick={runImport}
            className="border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
          >
            Import
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          MyAnimeList import isn&apos;t supported (their public list API is
          retired). MAL users can re-import via AniList.
        </p>
      </section>

      <section className="border-t border-line py-7">
        <h2 className="font-serif text-xl text-ink">Cloud sync</h2>
        <p className="mt-1 text-sm text-muted">
          Sync your list across devices with a private code. Anyone who has the
          code can read and overwrite the list, so keep it to yourself.
        </p>

        {hydrated && syncCode ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between border border-line px-3 py-2">
              <code className="font-mono text-sm text-ink">{syncCode}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(syncCode)}
                className="text-xs text-muted hover:text-ink"
              >
                Copy
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => push(syncCode)}
                className="border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
              >
                Push now
              </button>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard?.writeText(
                    `${window.location.origin}/list/${syncCode}`,
                  )
                }
                className="border border-line px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink"
              >
                Copy share link
              </button>
              <button
                type="button"
                onClick={disableSync}
                className="border border-line px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink"
              >
                Disable
              </button>
            </div>
            <p className="text-xs text-muted">
              Changes on this device now sync automatically.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <button
              type="button"
              disabled={busy}
              onClick={enableSync}
              className="border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
            >
              Enable sync &amp; get a code
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter an existing code"
                className="flex-1 border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
              <button
                type="button"
                disabled={busy}
                onClick={pull}
                className="border border-line px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
              >
                Connect &amp; pull
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-line py-7">
        <h2 className="font-serif text-xl text-ink">Backup</h2>
        <p className="mt-1 text-sm text-muted">
          Export your list to a file, or restore from one.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={exportFile}
            className="border border-line px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border border-line px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink"
          >
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={importFile}
            className="hidden"
          />
        </div>
      </section>

      {message ? (
        <p className="border-t border-line py-5 text-sm text-accent">{message}</p>
      ) : null}
    </div>
  );
}
