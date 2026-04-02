'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import SetupScreen from '@/components/SetupScreen';
import InterviewRoom from '@/components/InterviewRoom';
import ReportScreen from '@/components/ReportScreen';
import { InterviewConfig, ReportData, TranscriptItem } from '@/types';

export default function Home() {
  const [appState, setAppState] = useState<'setup' | 'interview' | 'report'>('setup');
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);

  const handleStart = (newConfig: InterviewConfig) => {
    setConfig(newConfig);
    setAppState('interview');
  };

  const handleEnd = (finalTranscript: TranscriptItem[], finalReport: ReportData) => {
    setTranscript(finalTranscript);
    setReport(finalReport);
    setAppState('report');
  };

  const handleRetry = () => {
    setAppState('setup');
    setConfig(null);
    setTranscript([]);
    setReport(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {appState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 overflow-y-auto"
          >
            <SetupScreen onStart={handleStart} />
          </motion.div>
        )}
        {appState === 'interview' && config && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <InterviewRoom config={config} onEnd={handleEnd} />
          </motion.div>
        )}
        {appState === 'report' && report && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <ReportScreen report={report} onRetry={handleRetry} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
