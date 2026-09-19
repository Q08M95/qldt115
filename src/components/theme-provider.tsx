"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Dark mode (mục 8.1b): class "dark" trên <html>, mặc định theo hệ thống, lưu lựa chọn vào localStorage.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
