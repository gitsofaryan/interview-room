import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                'flex min-h-[80px] w-full rounded-md border border-slate-400/40 bg-white/90 px-3 py-2 text-sm text-slate-900 ring-offset-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-300/25 dark:bg-slate-950/40 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-400',
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export { Textarea };
