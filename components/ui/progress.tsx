import * as React from 'react';
import { cn } from '@/lib/utils';

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
    const safeValue = Math.max(0, Math.min(100, value));

    return (
        <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-slate-800', className)}>
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${safeValue}%` }} />
        </div>
    );
}
