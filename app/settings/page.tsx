"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useStore, type PersistedState } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { readAdultCookie, setAdultCookie, subscribeAdult } from "@/lib/adult";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { PasteImport } from "@/components/paste-import";
import {
  DEFAULT_LEAD,
  disablePush,
  enablePush,
  getExistingSubscription,
  getRegistration,
  pushSupported,
  readLead,
  saveSubscription,
  watchingIds,
  writeLead,
} from "@/lib/push-client";
import type { ImportEntry } from "@/lib/types";

type PushState =
  | "loading"
  | "unsupported"
  | "unavailable"
  | "blocked"
  | "off"
  | "on";

const LEAD_OPTIONS = [
  { value: "0", label: "At air time" },
  { value: "10", label: "10 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "180", label: "3 hours before" },
  { value: "1440", label: "1 day before" },
];

function generateCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `${part()}-${part()}-${part()}`;
}

function CalendarLink({ label, url }: { label: string; url: string }) {
  const ready = url.startsWith("http");
  return (
    <div className="flex items-center justify-between gap-3 border border-line px-3 py-2">
      <div className="min-w-0">
        <p className="kicker">{label}</p>
        <code className="block truncate font-mono text-sm text-ink">{url}</code>
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={() => navigator.clipboard?.writeText(url)}
        className="flex-none text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
      >
        Copy
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const entries = useStore((s) => s.entries);
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
  const origin = hydrated ? window.location.origin : "";
  const adultQuery = allowAdult ? "?adult=1" : "";
  const [codeInput, setCodeInput] = useState("");
  const [importUser, setImportUser] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pushState, setPushState] = useState<PushState>("loading");
  const [lead, setLead] = useState(DEFAULT_LEAD);
  const fileRef = useRef<HTMLInputElement>(null);

  const watching = watchingIds(entries);

  // Resolve notification state on mount. Every setState lands in a .then so we
  // never set state synchronously in the effect body.
  useEffect(() => {
    let aborted = false;

    const resolve = async (): Promise<PushState> => {
      if (!pushSupported()) return "unsupported";
      const registration = await getRegistration();
      if (!registration) return "unavailable";
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) return "on";
      return Notification.permission === "denied" ? "blocked" : "off";
    };

    resolve()
      .then((state) => {
        if (aborted) return;
        setPushState(state);
        setLead(readLead());
      })
      .catch(() => {
        if (!aborted) setPushState("unavailable");
      });

    return () => {
      aborted = true;
    };
  }, []);

  const enableNotifications = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await enablePush(watching, lead);
      setPushState("on");
      setMessage(
        watching.length > 0
          ? `Notifications on for the ${watching.length} show${
              watching.length === 1 ? "" : "s"
            } you're watching.`
          : "Notifications on. Mark something as watching to start getting alerts.",
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Permission denied") {
        setPushState("blocked");
        setMessage(
          "Your browser blocked notifications. Allow them for this site, then try again.",
        );
      } else {
        setMessage("We couldn't turn notifications on. Give it another try.");
      }
    } finally {
      setBusy(false);
    }
  };

  const disableNotifications = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await disablePush();
      setPushState("off");
      setMessage("Notifications off on this device.");
    } catch {
      setMessage("That didn't work. Give it another try.");
    } finally {
      setBusy(false);
    }
  };

  const changeLead = async (value: string) => {
    const next = parseInt(value, 10);
    setLead(next);
    writeLead(next);
    if (pushState !== "on") return;
    const subscription = await getExistingSubscription();
    if (!subscription) return;
    await saveSubscription(subscription, watching, next).catch(() => {
      setMessage("We couldn't save that timing. Give it another try.");
    });
  };

  const sendTestNotification = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const subscription = await getExistingSubscription();
      if (!subscription) {
        setPushState("off");
        setMessage("This device isn't subscribed. Turn notifications on first.");
        return;
      }
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (res.status === 404 || res.status === 410) {
        setPushState("off");
        setMessage(
          "That subscription expired. Turn notifications off and on again.",
        );
        return;
      }
      if (!res.ok) throw new Error();
      setMessage(
        "Test sent. It should appear in Windows notifications within a few seconds — if nothing shows up, check Windows Settings → Notifications and make sure Focus assist is off.",
      );
    } catch {
      setMessage("The test didn't go through. Give it another try.");
    } finally {
      setBusy(false);
    }
  };

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
        setMessage("We couldn't find that AniList user.");
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
      setMessage("That import didn't work. Give it another try.");
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
      setMessage("Sync didn't go through. Check your connection and try again.");
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
        setMessage("We couldn't find anything saved under that code.");
        return;
      }
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { data: PersistedState };
      replaceAll({ ...body.data, syncCode: code });
      setCodeInput("");
      setMessage("Pulled your list from the cloud.");
    } catch {
      setMessage("That didn't work. Give the code another try.");
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
      setMessage("We couldn't read that file.");
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
            className="flex-1 border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-ink sm:text-sm"
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
        <h2 className="font-serif text-xl text-ink">Paste a list</h2>
        <PasteImport />
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
                className="flex-1 border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-ink sm:text-sm"
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
        <h2 className="font-serif text-xl text-ink">Notifications</h2>
        <p className="mt-1 text-sm text-muted">
          Get a desktop notification when an episode from your watching list is
          about to air. Set per device — turn it on wherever you want alerts.
        </p>

        {pushState === "on" ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted">Notify me</span>
              <Select
                ariaLabel="Notification timing"
                align="right"
                value={String(lead)}
                options={LEAD_OPTIONS}
                onValueChange={changeLead}
              />
            </div>
            <p className="text-xs text-muted">
              Watching {watching.length} show
              {watching.length === 1 ? "" : "s"}. Your list keeps itself in sync
              — mark something as watching and it&apos;s covered.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={sendTestNotification}
                className="border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
              >
                Send a test
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={disableNotifications}
                className="border border-line px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
              >
                Turn off
              </button>
            </div>
          </div>
        ) : null}

        {pushState === "off" ? (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={enableNotifications}
              className="border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
            >
              Turn on notifications
            </button>
            <p className="text-xs text-muted">
              Your browser will ask for permission. On Windows, install AniTrack
              as an app for the most reliable delivery.
            </p>
          </div>
        ) : null}

        {pushState === "blocked" ? (
          <p className="mt-4 text-sm text-muted">
            Notifications are blocked for this site. Allow them in your
            browser&apos;s site permissions, then reload this page.
          </p>
        ) : null}

        {pushState === "unavailable" ? (
          <p className="mt-4 text-sm text-muted">
            The service worker isn&apos;t running here. Notifications need a
            production build — they won&apos;t work in local development.
          </p>
        ) : null}

        {pushState === "unsupported" ? (
          <p className="mt-4 text-sm text-muted">
            This browser doesn&apos;t support push notifications.
          </p>
        ) : null}
      </section>

      <section className="border-t border-line py-7">
        <h2 className="font-serif text-xl text-ink">Calendar</h2>
        <p className="mt-1 text-sm text-muted">
          Subscribe to a live calendar of airing episodes. In Google Calendar:
          Add by URL → paste the link. Refreshes on its own every day or so.
        </p>
        <div className="mt-4 space-y-3">
          {hydrated && syncCode ? (
            <CalendarLink
              label="Watching"
              url={`${origin}/api/calendar/${syncCode}${adultQuery}`}
            />
          ) : null}
          <CalendarLink
            label="Everything airing"
            url={hydrated ? `${origin}/api/calendar${adultQuery}` : "…"}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {hydrated && syncCode
            ? "Watching covers the shows you're watching (60 days ahead); Everything airing covers the next 2 weeks."
            : "This covers everything airing (2 weeks). Enable cloud sync to also get a personal feed for your watching list."}
        </p>
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
