'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, Bot, FileText, Settings, HelpCircle } from 'lucide-react';

const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Marketplace', href: '/#marketplace', icon: ShoppingCart },
    { name: 'AI Agent', href: '/#ai-agent', icon: Bot },
];

const bottomItems = [
    { name: 'Documents', href: '#', icon: FileText },
    { name: 'Settings', href: '#', icon: Settings },
    { name: 'Help', href: '#', icon: HelpCircle },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">R</span>
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-xl">ReceivAI</h1>
                        <p className="text-gray-400 text-xs">Invoice Finance</p>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 py-4">
                <div className="px-4 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Menu
                    </span>
                </div>
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <item.icon size={20} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Navigation */}
            <div className="border-t border-white/10 py-4">
                {bottomItems.map((item) => (
                    <a
                        key={item.name}
                        href={item.href}
                        className="sidebar-nav-item opacity-60 hover:opacity-100"
                    >
                        <item.icon size={18} />
                        <span className="text-sm">{item.name}</span>
                    </a>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
                <div className="text-xs text-gray-500 text-center">
                    Built on Stellar
                </div>
            </div>
        </aside>
    );
}
