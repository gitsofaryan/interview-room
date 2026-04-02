'use client';

import { useRouter } from 'next/navigation';
import SetupScreen from '@/components/SetupScreen';
import { InterviewConfig } from '@/types';
import { setSessionState } from '@/lib/interview-session';

export default function SetupPage() {
    const router = useRouter();

    const handleStart = (config: InterviewConfig) => {
        setSessionState({
            config,
            transcript: [],
            report: null,
            tabSwitchCount: 0,
            pasteCount: 0,
            endedByIntegrity: false,
            notes: '',
        });
        router.push('/interview');
    };

    return (
        <main className="min-h-[calc(100vh-64px)]">
            <SetupScreen onStart={handleStart} />
        </main>
    );
}
