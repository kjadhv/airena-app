"use client";
import React, { useState, useEffect } from "react";
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
  Menu,
  X
} from "lucide-react";

// SidebarItem
type SidebarItemProps = {
  icon: React.ComponentType<LucideProps>;
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
  const bgClass =
    activeColor === "red" ? "bg-red-500/10" : "bg-emerald-500/10";

  const content = (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 my-1 rounded-xl group transition-all w-full
        ${isActive
          ? `${bgClass} font-semibold shadow`
          : `text-gray-400 hover:bg-white/[0.05] hover:text-${activeColor}-300`}
        ${mobile ? "" : ""}
      `}
    >
      <div className="relative">
        <Icon
          size={mobile ? 24 : 22}
          className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? colorClass : ""}`}
        />
        {isActive && !mobile && (
          <span
            className={`absolute -left-2 top-2 w-2 h-2 rounded-full ${activeColor === "red" ? "bg-red-400" : "bg-emerald-400"} animate-pulse`}
          ></span>
        )}
      </div>
      <span
        className={`
          overflow-hidden transition-all whitespace-nowrap text-base tracking-tight
          ${isExpanded || mobile ? "opacity-100" : "opacity-0 w-0"}
        `}
      >
        {text}
      </span>
      {text === "Live" && (
        <Dot
          className={`${isActive || activeColor === "red" ? "text-red-500" : "text-emerald-300"} animate-pulse`}
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

  // Close mobile menu on route change
  const pathname = usePathname();
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

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
          hidden lg:flex
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

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-emerald-400" />
          </button>
          
          <Link href="/" className="flex items-center justify-center">
            <img
              src="/headerlogo.png"
              alt="Logo"
              className="h-8 w-auto brightness-125"
              draggable={false}
            />
          </Link>

          <Link href="/profile" className="p-1">
            {user ? (
              <img
                src={user.photoURL || "/default-user.png"}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover bg-gray-400/30 border border-emerald-500/30"
              />
            ) : (
              <UserCircle size={32} className="text-gray-400" />
            )}
          </Link>
        </div>
      </header>

      {/* Mobile Fullscreen Menu */}
      <div
        className={`
          lg:hidden fixed inset-0 z-50 transition-all duration-300 ease-in-out
          ${isMobileOpen ? "visible" : "invisible"}
        `}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300
            ${isMobileOpen ? "opacity-100" : "opacity-0"}
          `}
          onClick={() => setIsMobileOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`
            absolute top-0 right-0 h-full w-[85%] max-w-sm
            bg-gradient-to-br from-gray-900 via-black to-gray-900
            shadow-2xl transition-transform duration-300 ease-out
            ${isMobileOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <div className="flex flex-col h-full p-6">
            {/* Close Button */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Menu</h2>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close menu"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            {/* Profile Section */}
            {user && (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl mb-6 border border-white/10">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500"
                  />
                ) : (
                  <UserCircle size={56} className="text-gray-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {user.displayName || "User"}
                  </p>
                  <p className="text-sm text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex flex-col gap-2 flex-grow">
              {navItems.map((item) => (
                <SidebarItem
                  key={item.text}
                  {...item}
                  isExpanded={true}
                  mobile={true}
                  activeColor={item.activeColor}
                  onClick={() => setIsMobileOpen(false)}
                />
              ))}
            </nav>

            {/* Sign In/Out */}
            <div className="border-t border-white/10 pt-4 mt-4">
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setIsMobileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={22} />
                  <span className="text-base font-medium">Sign Out</span>
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