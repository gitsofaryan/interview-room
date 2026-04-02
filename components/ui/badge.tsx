import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', {
    variants: {
        variant: {
            default: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-900 dark:text-cyan-100',
            secondary: 'border-slate-300/30 bg-slate-200/70 text-slate-800 dark:border-slate-300/20 dark:bg-slate-800 dark:text-slate-100',
            destructive: 'border-rose-400/40 bg-rose-500/15 text-rose-100',
            outline: 'border-slate-300/40 text-slate-700 dark:border-slate-300/30 dark:text-slate-100',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

function Badge({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
