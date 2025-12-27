"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  Tv,
  Newspaper,
  Dumbbell,
  Gamepad2,
  LayoutDashboard,
  LogIn,
  LogOut,
  UserCircle,
  Dot,
  Menu,
  X,
} from "lucide-react";

type SidebarItemProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  text: string;
  href: string;
  isExpanded: boolean;
  activeColor?: string;
  mobile?: boolean;
  onClick?: () => void;
};

const SidebarItem = ({
  icon: Icon,
  text,
  href,
  isExpanded,
  activeColor = "emerald",
  mobile = false,
  onClick,
}: SidebarItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  const isSignIn = text === "Sign In";
  const { setIsModalOpen } = useAuth();

  const colorClass =
    activeColor === "red"
      ? "text-red-500 group-hover:text-red-400"
      : "text-emerald-400 group-hover:text-emerald-300";
  const bgClass = activeColor === "red" ? "bg-red-500/10" : "bg-emerald-500/10";

  const content = (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl group transition-all w-full ${
        isActive
          ? `${bgClass} font-semibold shadow`
          : `text-gray-400 hover:bg-white/[0.05] hover:text-${activeColor}-300`
      }`}
    >
      <div className="relative">
        <Icon
          width={mobile ? 24 : 22}
          height={mobile ? 24 : 22}
          className={`shrink-0 transition-transform group-hover:scale-110 ${
            isActive ? colorClass : ""
          }`}
        />
        {isActive && !mobile && (
          <span
            className={`absolute -left-2 top-2 w-2 h-2 rounded-full ${
              activeColor === "red" ? "bg-red-400" : "bg-emerald-400"
            } animate-pulse`}
          />
        )}
      </div>

      <span
        className={`overflow-hidden transition-all whitespace-nowrap text-base tracking-tight ${
          isExpanded || mobile ? "opacity-100" : "opacity-0 w-0"
        }`}
      >
        {text}
      </span>

      {text === "Live" && (
        <Dot
          className={`${
            isActive || activeColor === "red"
              ? "text-red-500"
              : "text-emerald-300"
          } animate-pulse`}
          size={22}
        />
      )}
    </div>
  );

  if (isSignIn) {
    return (
      <button
        onClick={() => {
          setIsModalOpen(true);
          onClick?.();
        }}
        className="w-full mt-6 flex items-center justify-center"
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className="block" onClick={onClick}>
      {content}
    </Link>
  );
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setIsMobileOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const navItems = [
    { icon: Tv, text: "Live", href: "/live", activeColor: "red" },
    { icon: Tv, text: "Watch", href: "/watch" },
    { icon: Newspaper, text: "Blogs", href: "/blogs" },
    { icon: Dumbbell, text: "Sports", href: "/sports" },
    { icon: Gamepad2, text: "Games", href: "/games" },
    { icon: LayoutDashboard, text: "Dashboard", href: "/creator/dashboard" },
  ];

  return (
    <>
      {/* 🖥️ Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 h-screen z-40 group/sidebar
        bg-gradient-to-b from-black/80 via-gray-900/80 to-black/90
        backdrop-blur-xl border-r border-white/10
        transition-all duration-300 ease-in-out
        ${isExpanded ? "w-64" : "w-20"}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex flex-col h-full p-4 w-full">
          {/* Logo */}
          <div className="flex items-center justify-center mb-10 mt-2">
            <Link href="/" className="block">
              <div className="relative h-10 w-32">
                <Image
                  src="/headerlogo.png"
                  alt="Logo"
                  fill
                  className="object-contain hover:scale-105 transition-transform"
                  draggable={false}
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 flex-grow">
            {navItems.map((item) => (
              <SidebarItem
                key={item.text}
                {...item}
                isExpanded={isExpanded}
                activeColor={item.activeColor}
              />
            ))}
          </nav>

          {/* Profile/Login */}
          <div className="border-t border-white/10 pt-4 mt-4">
            {user ? (
              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 group transition-all">
                <Link href="/profile">
                  {user.photoURL ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10">
                      <Image
                        src={user.photoURL}
                        alt="Profile"
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <UserCircle size={40} className="text-gray-400" />
                  )}
                </Link>
                <div
                  className={`transition-all ${
                    isExpanded ? "opacity-100 ml-2" : "opacity-0 w-0"
                  }`}
                >
                  <span className="font-semibold text-white text-sm">
                    {user.displayName || "User"}
                  </span>
                </div>

                {isExpanded && (
                  <button
                    onClick={logout}
                    className="ml-auto text-gray-400 hover:text-red-500 transition"
                  >
                    <LogOut size={18} />
                  </button>
                )}
              </div>
            ) : (
              <SidebarItem icon={LogIn} text="Sign In" href="#" isExpanded={isExpanded} />
            )}
          </div>
        </div>
      </aside>

      {/* 📱 Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-emerald-400" />
          </button>

          <Link href="/" className="flex items-center justify-center">
            <div className="relative h-8 w-24">
              <Image
                src="/headerlogo.png"
                alt="Logo"
                fill
                className="object-contain brightness-125"
                draggable={false}
                priority
              />
            </div>
          </Link>

          <Link href="/profile">
            {user ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-emerald-500/30">
                <Image
                  src={user.photoURL || "/default-user.png"}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            ) : (
              <UserCircle size={28} className="text-gray-400" />
            )}
          </Link>
        </div>
      </header>

      {/* 📱 Mobile Fullscreen Menu */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ease-in-out ${
          isMobileOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileOpen(false)}
        />

        {/* Sliding Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[80%] max-w-sm bg-gradient-to-b from-gray-900 to-black shadow-2xl transition-transform duration-300 ease-out ${
            isMobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Menu</h2>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 flex-grow">
              {navItems.map((item) => (
                <SidebarItem
                  key={item.text}
                  {...item}
                  isExpanded={true}
                  mobile={true}
                  onClick={() => setIsMobileOpen(false)}
                />
              ))}
            </nav>

            <div className="border-t border-white/10 pt-4 mt-4">
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setIsMobileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition"
                >
                  <LogOut size={22} />
                  <span className="font-medium">Sign Out</span>
                </button>
              ) : (
                <SidebarItem
                  icon={LogIn}
                  text="Sign In"
                  href="#"
                  isExpanded={true}
                  mobile={true}
                  onClick={() => setIsMobileOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}