"use client";

import React, { useEffect } from "react";
import { Search, Bell, Users } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useSearch } from "@/app/context/SearchContext";

const TopBar = () => {
  const pathname = usePathname();
  const { search, setSearch } = useSearch();
  const router = useRouter();

  const isHome = pathname === "/";

  // 🔁 Redirect to watch when searching (only from home)
  useEffect(() => {
    if (isHome && search.trim()) {
      router.push("/watch");
    }
  }, [search, isHome, router]);

  // 🔥 Clear search when leaving home
  useEffect(() => {
    if (!isHome && search) {
      setSearch("");
    }
  }, [isHome, search, setSearch]);

  return (
    <div className="sticky top-0 z-40 h-16 flex items-center px-6">
      <div className="flex-1" />

      {/* ✅ SHOW ONLY ON HOME */}
      {isHome && (
        <>
          {/* SEARCH */}
          <div className="flex items-center bg-black border border-gray-800 rounded-xl px-4 py-2 w-full max-w-md">
            <Search size={18} className="text-gray-400" />
            <input
              id="global-search"
              name="global-search"
              type="text"
              placeholder="Search games, sports, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value.toLowerCase())}
              className="bg-transparent outline-none text-sm text-white placeholder-gray-500 ml-3 w-full"
            />
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex-1 flex justify-end gap-3">
            {/* COMMUNITY */}
            <button
              onClick={() => router.push("/community")}
              className="relative bg-black border border-gray-800 p-2 rounded-xl hover:border-emerald-500 transition"
              title="Community"
            >
              <Users size={20} className="text-gray-400 hover:text-white" />
            </button>

            {/* NOTIFICATIONS */}
            <button
              className="relative bg-black border border-gray-800 p-2 rounded-xl hover:border-emerald-500 transition"
              title="Notifications"
            >
              <Bell size={20} className="text-gray-400 hover:text-white" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TopBar;
