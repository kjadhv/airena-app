"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Home, 
    PlayCircle, 
    Radio, 
    Gamepad2, 
    Film, 
    Search,
    LucideProps
} from 'lucide-react';

// --- PROPS INTERFACE ---
interface WatchSidebarProps {
    onSearch: (query: string) => void;
    onCategorySelect: (category: 'live' | 'games' | 'sports' | null) => void;
}

// --- REUSABLE LINK/BUTTON COMPONENT TYPES ---
// This ensures that an item is either a link (with href) or a button (with onClick), but not both.
type BaseSidebarItemProps = {
    icon: React.ComponentType<LucideProps>;
    text: string;
    isActive: boolean;
    isExpanded: boolean;
};

type LinkItemProps = BaseSidebarItemProps & { href: string; onClick?: never; };
type ButtonItemProps = BaseSidebarItemProps & { href?: never; onClick: () => void; };

type SidebarItemProps = LinkItemProps | ButtonItemProps;

// --- REUSABLE COMPONENT ---
const SidebarItem = ({ icon: Icon, text, href, onClick, isActive, isExpanded }: SidebarItemProps) => {
    const className = `
        flex items-center p-3 my-1 w-full rounded-lg transition-colors duration-200
        ${isActive 
            ? 'bg-emerald-500/10 text-emerald-300' 
            : 'text-gray-400 hover:bg-white/10 hover:text-white'}
    `;

    const content = (
        <>
            <Icon size={24} className="shrink-0" />
            <span className={`
                ml-4 font-semibold overflow-hidden transition-all duration-200 
                whitespace-nowrap ${isExpanded ? 'opacity-100 w-40' : 'opacity-0 w-0'}
            `}>
                {text}
            </span>
        </>
    );

    if (href) {
        return <Link href={href} className={className}>{content}</Link>;
    }

    return <button onClick={onClick} className={className}>{content}</button>;
};


// --- MAIN SIDEBAR COMPONENT ---
const WatchSidebar = ({ onSearch, onCategorySelect }: WatchSidebarProps) => {
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

    const mainLinks = [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/watch', icon: PlayCircle, label: 'Watch' },
    ];
    
    const categoryLinks = [
        { category: 'live' as const, icon: Radio, label: 'Live Creators' },
        { category: 'games' as const, icon: Gamepad2, label: 'Games' },
        { category: 'sports' as const, icon: Film, label: 'Sports' },
    ];

    const handleCategoryClick = (category: 'live' | 'games' | 'sports') => {
        const newCategory = activeCategory === category ? null : category;
        setActiveCategory(newCategory);
        onCategorySelect(newCategory);
    };

    return (
        <aside 
            className={`
                group fixed top-0 left-0 z-40 h-screen
                bg-gradient-to-r from-black/80 via-black/60 to-transparent backdrop-blur-md
                transition-all duration-300 ease-in-out
                ${isExpanded ? 'w-64' : 'w-20'}
            `}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <div className="flex flex-col h-full p-4">
                {/* Search Bar */}
                <div className="relative mb-6 h-10 flex items-center">
                     <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 z-10 transition-all ${isExpanded ? 'left-3' : 'left-1/2 -translate-x-1/2'}`} size={20}/>
                     <input 
                        type="text" 
                        placeholder="Search..." 
                        onChange={(e) => onSearch(e.target.value)} 
                        className={`
                            w-full h-full bg-white/5 border border-white/10 rounded-lg pr-3 py-2 text-white 
                            focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200
                            ${isExpanded ? 'pl-10 opacity-100' : 'pl-0 opacity-0'}
                        `}
                    />
                </div>

                {/* Main Navigation */}
                <nav>
                    {mainLinks.map(({ href, icon, label }) => (
                        <SidebarItem 
                            key={href}
                            href={href}
                            icon={icon}
                            text={label}
                            isActive={pathname === href}
                            isExpanded={isExpanded}
                        />
                    ))}
                </nav>

                <div className="border-t border-white/10 my-4"></div>

                {/* Category Filters */}
                <div className="flex-grow">
                    <h3 className={`text-xs text-gray-500 uppercase tracking-wider mb-2 transition-all duration-200 ${isExpanded ? 'pl-3' : 'text-center'}`}>
                        {isExpanded ? 'Categories' : '...'}
                    </h3>
                    {categoryLinks.map(({ category, icon, label }) => (
                        <SidebarItem 
                            key={category}
                            icon={icon}
                            text={label}
                            onClick={() => handleCategoryClick(category)}
                            isActive={activeCategory === category}
                            isExpanded={isExpanded}
                        />
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default WatchSidebar;

