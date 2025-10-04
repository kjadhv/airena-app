"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { 
    Tv,
    Newspaper,
    Dumbbell,
    Gamepad2,
    LogIn,
    LogOut,
    UserCircle,
    LucideProps
} from 'lucide-react';

// Type for the props of the SidebarItem component
type SidebarItemProps = {
    icon: React.ComponentType<LucideProps>;
    text: string;
    href: string;
    isExpanded: boolean;
};

// Reusable component for sidebar navigation items
const SidebarItem = ({ icon: Icon, text, href, isExpanded }: SidebarItemProps) => {
    const pathname = usePathname();
    const isActive = pathname === href;
    const isSignIn = text === "Sign In";
    const { setIsModalOpen } = useAuth();


    const content = (
         <div className={`
            flex items-center p-3 my-1 rounded-lg transition-colors w-full
            ${isActive 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}
        `}>
            <Icon size={24} className="shrink-0" />
            <span className={`
                overflow-hidden transition-all whitespace-nowrap ${isExpanded ? 'w-40 ml-4' : 'w-0'}
            `}>{text}</span>
        </div>
    )

    if (isSignIn) {
        return (
            <button onClick={() => setIsModalOpen(true)} className="w-full">
                {content}
            </button>
        )
    }

    return <Link href={href}>{content}</Link>;
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);

    const navItems = [
        { icon: Tv, text: 'Watch', href: '/watch' },
        { icon: Newspaper, text: 'Blogs', href: '/blogs' },
        { icon: Dumbbell, text: 'Sports', href: '/sports' },
        { icon: Gamepad2, text: 'Games', href: '/games' },
    ];
    
    return (
        <aside 
            className={`
                fixed top-0 left-0 h-screen z-40 
                bg-gradient-to-r from-black/80 via-black/60 to-transparent backdrop-blur-md
                transition-all duration-300 ease-in-out
                ${isExpanded ? 'w-64' : 'w-20'}
            `}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <div className="flex flex-col h-full p-4">
                {/* Top Section: Logo */}
                <div className="flex items-center justify-center mb-8 h-10">
                    <Link href="/">
                        <img 
                            src="/logo.webp" 
                            alt="Logo" 
                            className="h-10 w-auto transition-transform duration-300 hover:scale-110"
                        />
                    </Link>
                </div>

                {/* Navigation Links */}
                <nav className="flex-grow">
                    {navItems.map(item => <SidebarItem key={item.text} {...item} isExpanded={isExpanded} />)}
                </nav>

                {/* Bottom Section: User Profile/Login */}
                <div className="border-t border-white/10 pt-4">
                    {user ? (
                        <Link href="/profile" className="flex items-center p-2 rounded-lg hover:bg-gray-700/50">
                            <UserCircle size={40} className="rounded-full text-gray-400 shrink-0" />
                            <div className={`flex justify-between items-center overflow-hidden transition-all ${isExpanded ? 'w-full ml-3' : 'w-0'}`}>
                                <div className="leading-4">
                                    <h4 className="font-semibold text-white truncate whitespace-nowrap">{user.displayName || 'User Profile'}</h4>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">View Profile</span>
                                </div>
                                <button onClick={(e) => { e.preventDefault(); logout(); }} className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-800" aria-label="Sign Out">
                                    <LogOut size={20} />
                                </button>
                            </div>
                        </Link>
                    ) : (
                        <SidebarItem icon={LogIn} text="Sign In" href="#" isExpanded={isExpanded} />
                    )}
                </div>
            </div>
        </aside>
    );
}

