'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InterviewRoom from '@/components/InterviewRoom';
import { getSessionState, setSessionState } from '@/lib/interview-session';
import { InterviewConfig, ReportData, TranscriptItem } from '@/types';

export default function InterviewPage() {
    const router = useRouter();
    const [config, setConfig] = useState<InterviewConfig | null>(null);

    useEffect(() => {
        const state = getSessionState();
        if (!state.config) {
            router.replace('/setup');
            return;
        }
        setConfig(state.config);
    }, [router]);

    const handleEnd = (transcript: TranscriptItem[], report: ReportData) => {
        setSessionState({ transcript, report });
        router.push('/report');
    };

    if (!config) {
        return <main className="flex min-h-[calc(100vh-64px)] items-center justify-center text-sm text-slate-700 dark:text-slate-300">Loading interview session...</main>;
    }

    return (
        <main className="h-[calc(100vh-64px)] overflow-hidden">
            <InterviewRoom config={config} onEnd={handleEnd} />
        </main>
    );
}
