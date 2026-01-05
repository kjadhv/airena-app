"use client";

import React, { useState } from "react";
import { Search, Users } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useSearch } from "@/app/context/SearchContext";
import NotificationDropdown from "./NotificationDropdown";

const TopBar = () => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { search, setSearch, applySearch } = useSearch();

  const isHome = pathname === "/";

  return (
    <div className="sticky top-0 z-50 h-14 md:h-16 flex items-center px-3 md:px-6 ">
      <div className="flex-1" />

      {/* 🔍 SEARCH BAR — ALL DEVICES */}
      {isHome && mobileSearchOpen && (
        <div className="absolute inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl top-14 md:top-16 z-50">
          <div className="flex items-center bg-black border border-emerald-500/40 rounded-xl px-4 py-2 shadow-[0_0_20px_rgba(16,185,129,0.6)]">
            <Search size={18} className="text-emerald-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search games, sports, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value.toLowerCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  applySearch();
                  setMobileSearchOpen(false);
                  router.push("/watch");
                }
              }}
              className="bg-transparent outline-none text-sm text-white placeholder-gray-500 ml-3 w-full"
            />

            <button
              onClick={() => setMobileSearchOpen(false)}
              className="ml-2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* RIGHT ACTIONS */}
      <div className="flex-1 flex justify-end gap-2 md:gap-3 items-center">
        {/* 🔍 SEARCH BUTTON - Opens search bar on all devices */}
        {isHome && (
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="relative p-2 rounded-xl bg-black
               border border-emerald-400/40
               text-emerald-400
               shadow-[0_0_10px_rgba(34,211,238,0.6)]
               ring-1 ring-emerald-400/30
               transition-all duration-300
               hover:shadow-[0_0_20px_rgba(34,211,238,0.9)]
               hover:ring-emerald-400/60
               hover:text-emerald-300"
            title="Search"
          >
            <Search size={18} />
          </button>
        )}
        <button
          onClick={() => router.push("/community")}
          className="relative p-2 rounded-xl bg-black border border-emerald-500/40
                     text-emerald-400
                     shadow-[0_0_12px_rgba(16,185,129,0.6)]
                     ring-1 ring-emerald-400/30
                     transition-all duration-300
                     hover:shadow-[0_0_22px_rgba(16,185,129,0.9)]
                     hover:ring-emerald-400/60
                     hover:text-emerald-300"
          title="Community"
        >
          <Users size={18} />
        </button>

        {/* 🔔 Notifications */}
        <NotificationDropdown />
      </div>
    </div>
  );
};

export default TopBar;