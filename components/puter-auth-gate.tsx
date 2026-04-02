'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ensurePuterSignedIn } from '@/lib/puter';
import { Button } from '@/components/ui/button';

export function PuterAuthGate({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorText, setErrorText] = useState('');

    const runAuth = async () => {
        setStatus('loading');
        setErrorText('');
        try {
            await ensurePuterSignedIn();
            setStatus('ready');
        } catch (error) {
            setErrorText(error instanceof Error ? error.message : 'Failed to initialize Puter login');
            setStatus('error');
        }
    };

    useEffect(() => {
        runAuth();
    }, []);

    if (status === 'ready') {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-slate-400/45 bg-white/90 p-6 text-center shadow-xl backdrop-blur dark:border-slate-300/20 dark:bg-slate-900/70">
                {status === 'loading' && (
                    <>
                        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-700 dark:text-cyan-300" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Signing in with Puter</h2>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Please wait while we verify your session.</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-200">Unable to continue</h2>
                        <p className="mt-2 text-sm text-rose-700/90 dark:text-rose-100/90">{errorText}</p>
                        <Button className="mt-4" onClick={runAuth}>
                            Retry Login
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
