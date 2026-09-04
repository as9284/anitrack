"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Next scrolls to the top of a new route by measuring the first DOM node the
// new segment rendered. When that first commit is a loading fallback rather
// than the page, the check sometimes bails and the previous page's scroll
// offset survives — so a shorter page (an anime detail opened from far down
// the homepage) lands clamped to its bottom. This re-asserts the top after
// every push navigation. Back/forward are left alone so the restored
// position still wins there.
let traversing = false;

export function ScrollReset() {
  const pathname = usePathname();
  const last = useRef(pathname);

  useEffect(() => {
    const onPop = () => {
      traversing = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    if (traversing) {
      traversing = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
