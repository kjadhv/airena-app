"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, PlayCircle, Radio, Gamepad2, Film, Search, X, Menu } from 'lucide-react';

interface WatchSidebarProps {
    isOpen: boolean;
    toggle: () => void;
    onSearch: (query: string) => void;
    onCategorySelect: (category: 'live' | 'games' | 'sports' | 'all') => void;
}

const WatchSidebar = ({ isOpen, toggle, onSearch, onCategorySelect }: WatchSidebarProps) => {
    const [pathname, setPathname] = useState('');

    useEffect(() => {
        // Fallback for environments where Next.js routing hooks aren't available
        // This ensures client-side compatibility.
        if (typeof window !== 'undefined') {
            setPathname(window.location.pathname);
        }
    }, []);

    const mainLinks = [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/watch', icon: PlayCircle, label: 'Watch' },
    ];
    
    const categoryLinks = [
        { category: 'live' as const, icon: Radio, label: 'Live Creators' },
        { category: 'games' as const, icon: Gamepad2, label: 'Games' },
        { category: 'sports' as const, icon: Film, label: 'Sports' },
    ];

    return (
        <>
            {/* --- Sidebar for Desktop --- */}
            <aside className={`fixed top-0 left-0 z-40 h-full pt-24 hidden lg:flex flex-col bg-black/50 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
                <div className={`flex-grow px-4 space-y-2`}>
                    {mainLinks.map(({ href, icon: Icon, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-4 py-3 rounded-xl transition-colors duration-200 ${pathname === href ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:text-white hover:bg-white/10'} ${isOpen ? 'px-4' : 'justify-center'}`}
                            title={label}
                        >
                            <Icon size={22} />
                            {isOpen && <span className="font-semibold">{label}</span>}
                        </Link>
                    ))}
                    <div className="border-t border-white/10 my-4"></div>
                    
                     <div className={`relative my-4 ${isOpen ? 'px-2' : 'px-0'}`}>
                        <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isOpen ? 'left-5' : 'left-1/2 -translate-x-1/2'}`} size={18}/>
                        {isOpen && <input type="text" placeholder="Search..." onChange={(e) => onSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"/>}
                    </div>

                    <div className="border-t border-white/10 my-4"></div>

                    {categoryLinks.map(({ category, icon: Icon, label }) => (
                        <button
                            key={category}
                            onClick={() => onCategorySelect(category)}
                            className={`w-full flex items-center gap-4 py-3 rounded-xl transition-colors duration-200 text-gray-400 hover:text-white hover:bg-white/10 ${isOpen ? 'px-4' : 'justify-center'}`}
                            title={label}
                        >
                            <Icon size={22} />
                            {isOpen && <span className="font-semibold">{label}</span>}
                        </button>
                    ))}
                </div>
            </aside>

            {/* --- Mobile/Tablet Bottom Nav (Conceptual) --- */}
            {/* For a true mobile-first feel, a bottom nav bar is often better than a slide-out menu. */}
        </>
    );
};

export default WatchSidebar;