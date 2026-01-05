"use client";

import React, { createContext, useContext, useState } from "react";

/* ===================== TYPES ===================== */
type SearchContextType = {
  search: string;                 // input value
  appliedSearch: string;          // active filter
  setSearch: (v: string) => void;
  applySearch: () => void;
  clearSearch: () => void;
};

/* ===================== CONTEXT ===================== */
const SearchContext = createContext<SearchContextType | null>(null);

/* ===================== PROVIDER ===================== */
export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // 🔥 Apply search & clear input
  const applySearch = () => {
    const value = search.trim().toLowerCase();
    if (!value) return;

    setAppliedSearch(value); // used by watch page
    setSearch("");           // clears search bar
  };

  // Optional: clear everything
  const clearSearch = () => {
    setSearch("");
    setAppliedSearch("");
  };

  return (
    <SearchContext.Provider
      value={{
        search,
        appliedSearch,
        setSearch,
        applySearch,
        clearSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

/* ===================== HOOK ===================== */
export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used inside SearchProvider");
  }
  return ctx;
};
