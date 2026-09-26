"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)"; // dưới breakpoint md của Tailwind

// true khi màn hình dưới 768px (mobile). Lần render trên máy chủ luôn false, sau khi tải trang mới cập nhật.
export function useMobile(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
