"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  Tv,
  Newspaper,
  Dumbbell,
  Gamepad2,
  LogIn,
  LogOut,
  UserCircle,
  LucideProps,
  Dot,
  Menu
} from "lucide-react";

// SidebarItem
type SidebarItemProps = {
  icon: React.ComponentType<LucideProps>;
  text: string;
  href: string;
  isExpanded: boolean;
  activeColor?: string;
  mobile?: boolean;
};

const SidebarItem = ({
  icon: Icon,
  text,
  href,
  isExpanded,
  activeColor = "emerald",
  mobile = false,
}: SidebarItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  const isSignIn = text === "Sign In";
  const { setIsModalOpen } = useAuth();
  const colorClass =
    activeColor === "red"
      ? "text-red-500 group-hover:text-red-400"
      : "text-emerald-400 group-hover:text-emerald-300";
  const bgClass =
    activeColor === "red" ? "bg-red-500/10" : "bg-emerald-500/10";

  const content = (
    <div
      className={`
        flex items-center gap-3 px-3 py-3 my-1 rounded-xl group transition-all w-full
        ${isActive
          ? `${bgClass} font-semibold shadow shadow-${activeColor}-500/20`
          : `text-gray-400 hover:bg-white/[0.03] hover:text-${activeColor}-300`}
        ${mobile ? "justify-center" : ""}
      `}
    >
      <div className="relative">
        <Icon
          size={mobile ? 24 : 28}
          className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? colorClass : ""}`}
        />
        {isActive && (
          <span
            className={`absolute -left-2 top-2 w-2 h-2 rounded-full bg-${activeColor}-400 animate-pulse`}
          ></span>
        )}
      </div>
      <span
        className={`
          overflow-hidden transition-all whitespace-nowrap text-base tracking-tight
          ${isExpanded && !mobile ? "opacity-100 ml-2" : "opacity-0 ml-0"}
        `}
      >
        {text}
      </span>
      {text === "Live" && (
        <Dot
          className={`ml-1 ${isActive || activeColor === "red" ? "text-red-500" : "text-emerald-300"} animate-pulse`}
          size={mobile ? 18 : 22}
        />
      )}
    </div>
  );

  if (isSignIn) {
    return (
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full mt-6 flex items-center justify-center"
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { icon: Tv, text: "Live", href: "/live", activeColor: "red" },
    { icon: Tv, text: "Watch", href: "/watch" },
    { icon: Newspaper, text: "Blogs", href: "/blogs" },
    { icon: Dumbbell, text: "Sports", href: "/sports" },
    { icon: Gamepad2, text: "Games", href: "/games" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex
          fixed top-0 left-0 h-screen z-40 group/sidebar
          bg-gradient-to-br from-black/80 via-gray-900/70 to-transparent
          shadow-2xl shadow-emerald-500/10 backdrop-blur-xl select-none
          transition-all duration-300 ease-in-out
          ${isExpanded ? "w-64" : "w-20"}
        `}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex flex-col h-full p-3 w-full">
          {/* Logo */}
          <div className="flex items-center justify-center mb-10 mt-2 h-12">
            <Link href="/" className="block">
              <img
                src="/headerlogo.png"
                alt="Logo"
                className="h-10 w-auto transition-transform duration-200 hover:scale-110 brightness-125"
                draggable={false}
              />
            </Link>
          </div>
          {/* Navigation */}
          <nav className="flex flex-col gap-1 flex-grow relative">
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
          <div className="border-t border-white/10 pt-4 mt-6">
            {user ? (
              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 group transition-all">
                <div className="relative">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-11 h-11 rounded-full object-cover bg-gray-400/30"
                    />
                  ) : (
                    <UserCircle size={44} className="rounded-full text-gray-400 bg-gray-900/60 p-1" />
                  )}
                </div>
                <div
                  className={`
                    flex flex-col justify-center min-w-0 transition-all
                    ${isExpanded ? "opacity-100 ml-2 w-40" : "opacity-0 w-0"}
                  `}
                >
                  <span className="font-semibold text-white truncate">
                    {user.displayName || "User Profile"}
                  </span>
                  <span className="text-xs text-gray-400">View Profile</span>
                </div>
                {isExpanded && (
                  <button
                    onClick={logout}
                    className="ml-auto text-gray-400 hover:text-red-500 rounded-full p-2 transition"
                    aria-label="Sign Out"
                  >
                    <LogOut size={20} />
                  </button>
                )}
              </div>
            ) : (
              <SidebarItem
                icon={LogIn}
                text="Sign In"
                href="#"
                isExpanded={isExpanded}
              />
            )}
          </div>
        </div>
      </aside>
      {/* Mobile Bottom Navigation */}
      <nav
        className={`fixed md:hidden bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-gray-900/90 to-transparent backdrop-blur-lg shadow-emerald-500/5`}
      >
        <div className="flex justify-between items-center px-2 py-2">
          {/* Hamburger for mobile menu/modal */}
          <button
            className="p-2"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Open menu"
          >
            <Menu size={28} className="text-emerald-400" />
          </button>
          <Link href="/" className="flex items-center justify-center">
            <img
              src="/headerlogo.png"
              alt="Logo"
              className="h-8 w-auto transition-transform duration-200 hover:scale-110 brightness-125"
              draggable={false}
            />
          </Link>
          <div>
            {user ? (
              <img
                src={user.photoURL || "/default-user.png"}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover bg-gray-400/30"
              />
            ) : (
              <LogIn size={28} className="text-gray-400" />
            )}
          </div>
        </div>
        {/* Slide-up panel for menu */}
        <div
          className={`absolute bottom-[60px] left-0 right-0 mx-4 bg-gray-900/95 rounded-xl shadow-lg p-2 text-center transition-transform duration-300 ${
            isMobileOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
          }`}
        >
          {navItems.map((item) => (
            <SidebarItem
              key={item.text}
              {...item}
              isExpanded={true}
              mobile={true}
              activeColor={item.activeColor}
            />
          ))}
        </div>
      </nav>
    </>
  );
}
