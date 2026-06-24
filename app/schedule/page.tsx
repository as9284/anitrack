import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getSchedule } from "@/lib/anilist";
import { ADULT_COOKIE } from "@/lib/adult";
import { nowSeconds } from "@/lib/utils";
import { ScheduleClient } from "@/components/schedule-client";
import type { ScheduleItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Schedule",
};

export default async function SchedulePage() {
  const cookieStore = await cookies();
  const allowAdult = cookieStore.get(ADULT_COOKIE)?.value === "1";
  const start = nowSeconds();
  const end = start + 7 * 86400;

  let items: ScheduleItem[] = [];
  let failed = false;
  try {
    items = await getSchedule(start, end, allowAdult);
  } catch {
    failed = true;
  }

  return (
    <div className="py-10">
      <p className="kicker">Airing timetable</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">This week</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Every episode airing over the next seven days, in your local time.
      </p>

      <div className="mt-10">
        {failed ? (
          <p className="border border-line px-5 py-8 text-center text-sm text-muted">
            Couldn&apos;t reach AniList just now. Please refresh in a moment.
          </p>
        ) : (
          <ScheduleClient items={items} />
        )}
      </div>
    </div>
  );
}
