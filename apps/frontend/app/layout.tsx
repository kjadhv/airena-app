"use client";

import React, { useEffect } from "react";
import { Geist } from "next/font/google";
import "./global.css";
import { AuthProvider } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
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
  useEffect(() => {
    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)")
      .matches;
    if (isDesktop) {
      const handleMouseMove = (e: MouseEvent) => {
        document.documentElement.style.setProperty(
          "--mouse-x",
          `${e.clientX}px`
        );
        document.documentElement.style.setProperty(
          "--mouse-y",
          `${e.clientY}px`
        );
      };
      window.addEventListener("mousemove", handleMouseMove);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, []);

  return (
    <html lang="en" className={geistSans.variable}>
      <body className="bg-black text-slate-100 antialiased">
        <AuthProvider>
          <div className="relative min-h-screen">
            {/* Sidebar - Always rendered */}
            <Sidebar />
            
            {/* Main Content Area - Full width, sidebar overlays */}
            <main className="relative w-full min-h-screen">
              {children}
            </main>

            {/* Auth Modal */}
            <AuthModal />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}