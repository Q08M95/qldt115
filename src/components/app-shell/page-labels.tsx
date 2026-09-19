"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

// Nhãn động cho breadcrumb/tiêu đề trang: trang có đoạn URL là mã (vd /nhan-su/<uuid>) khai báo tên hiển thị
// (vd họ tên) bằng <BreadcrumbLabel>, Topbar đọc lại để hiển thị thay cho mã.
interface PageLabelsValue {
  labels: Record<string, string>;
  setLabel: (href: string, label: string | null) => void;
}

const PageLabelsContext = createContext<PageLabelsValue>({ labels: {}, setLabel: () => {} });

export function PageLabelsProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const setLabel = useCallback((href: string, label: string | null) => {
    setLabels((prev) => {
      if (label === null) {
        if (!(href in prev)) return prev;
        const next = { ...prev };
        delete next[href];
        return next;
      }
      return prev[href] === label ? prev : { ...prev, [href]: label };
    });
  }, []);

  const value = useMemo(() => ({ labels, setLabel }), [labels, setLabel]);
  return <PageLabelsContext.Provider value={value}>{children}</PageLabelsContext.Provider>;
}

export function usePageLabels() {
  return useContext(PageLabelsContext).labels;
}

// Đặt trong trang: <BreadcrumbLabel label={profile.ho_ten} /> — không render gì ra giao diện
export function BreadcrumbLabel({ label }: { label: string }) {
  const pathname = usePathname();
  const { setLabel } = useContext(PageLabelsContext);

  useEffect(() => {
    setLabel(pathname, label);
    return () => setLabel(pathname, null);
  }, [pathname, label, setLabel]);

  return null;
}
