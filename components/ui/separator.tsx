import * as React from 'react';
import { cn } from '@/lib/utils';

export function Separator({ className, orientation = 'horizontal' }: { className?: string; orientation?: 'horizontal' | 'vertical' }) {
    return (
        <div
            className={cn(
                'shrink-0 bg-slate-300/20',
                orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
                className
            )}
            role="separator"
            aria-orientation={orientation}
        />
    );
}
