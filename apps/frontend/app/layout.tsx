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
          {/* Sidebar with semi-transparent, blurred background */}
          <div className="fixed left-0 top-0 h-full w-20 bg-black/50 backdrop-blur-md border-r border-white/10 z-40">
            <Sidebar />
          </div>

          {/* Main content area — shifted to match sidebar width */}
          <main
            className="
              ml-20
              transition-all duration-300 ease-in-out
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
