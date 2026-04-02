'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BotMessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/', label: 'Home' },
    { href: '/setup', label: 'Setup' },
    { href: '/interview', label: 'Interview' },
    { href: '/report', label: 'Report' },
];

export function AppHeader() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-40 border-b border-slate-400/45 bg-white/90 backdrop-blur dark:border-slate-300/20 dark:bg-slate-950/70">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <span className="rounded-md bg-cyan-500/20 p-1.5 text-cyan-700 dark:text-cyan-200">
                        <BotMessageSquare className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold tracking-wide">AI Interview Pro</span>
                </Link>

                <nav className="hidden items-center gap-1 md:flex">
                    {navItems.map((item) => {
                        const active = pathname === item.href;
                        return (
                            <Button key={item.href} asChild size="sm" variant="ghost" className={cn(active && 'bg-cyan-500/15 text-cyan-900 dark:bg-slate-800 dark:text-cyan-200')}>
                                <Link href={item.href}>{item.label}</Link>
                            </Button>
                        );
                    })}
                </nav>

                <ModeToggle />
            </div>
        </header>
    );
}
