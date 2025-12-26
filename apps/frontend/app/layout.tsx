"use client";

import React, { useEffect } from "react";
import { Geist } from "next/font/google";
import "./global.css";

import { AuthProvider } from "./context/AuthContext";
import { SearchProvider } from "./context/SearchContext";
import { LanguageProvider } from "@/app/context/LanguageContext";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import AuthModal from "./components/AuthModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // mouse glow effect (this is fine)
  useEffect(() => {
    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (isDesktop) {
      const handleMouseMove = (e: MouseEvent) => {
        document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
        document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
      };
      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  return (
    <html lang="en" className={geistSans.variable} suppressHydrationWarning>
      <head>
        {/* 🔥 APPLY THEME BEFORE HYDRATION - FIXED */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    const theme = localStorage.getItem("airena-theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");  
    }
  } catch (_) {}
})();
`,
          }}
        />
      </head>

      <body className="bg-white text-black dark:bg-black dark:text-slate-100 antialiased">
        <AuthProvider>
          <LanguageProvider>
            <SearchProvider>
              <div className="relative min-h-screen">
                <Sidebar />

                <div className="relative min-h-screen flex flex-col">
                  <TopBar />
                  <main className="relative flex-1 w-full">
                    {children}
                  </main>
                </div>

                <AuthModal />
              </div>
            </SearchProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}