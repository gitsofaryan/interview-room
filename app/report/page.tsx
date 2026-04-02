'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReportScreen from '@/components/ReportScreen';
import { clearSessionState, getSessionState } from '@/lib/interview-session';
import { ReportData } from '@/types';

export default function ReportPage() {
    const router = useRouter();
    const [report, setReport] = useState<ReportData | null>(null);

    useEffect(() => {
        const state = getSessionState();
        if (!state.report) {
            router.replace('/setup');
            return;
        }
        setReport(state.report);
    }, [router]);

    const handleRetry = () => {
        clearSessionState();
        router.push('/setup');
    };

    if (!report) {
        return <main className="flex min-h-[calc(100vh-64px)] items-center justify-center text-sm text-slate-700 dark:text-slate-300">Loading report...</main>;
    }

    return (
        <main className="min-h-[calc(100vh-64px)]">
            <ReportScreen report={report} onRetry={handleRetry} />
        </main>
    );
}
