'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ModeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = resolvedTheme === 'dark';

    const handleToggle = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            aria-label="Toggle theme"
            title="Toggle theme"
            disabled={!mounted}
        >
            {mounted ? (isDark ? 'Light Mode' : 'Dark Mode') : 'Theme'}
        </Button>
    );
}
