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
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <html lang="en" className={`${geistSans.variable}`}>
      <body className="bg-black text-white overflow-x-hidden">
        <AuthProvider>
          <Sidebar />

          {/* 💡 MAIN CONTENT LAYOUT FIX */}
          <main
            className="
              transition-all duration-300 ease-in-out
              lg:pl-20
              xl:pl-64
              pt-[64px] lg:pt-0
            "
          >
            {children}
          </main>

          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
