'use client';

import { motion } from 'motion/react';
import { Download, RotateCcw, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { ReportData } from '@/types';
import { Button } from '@/components/ui/button';

export default function ReportScreen({ report, onRetry }: { report: ReportData, onRetry: () => void }) {
  const recommendation = report.recommendation ?? (report.score >= 8 ? 'Strong Hire' : report.score >= 6.5 ? 'Hire' : 'No Hire');
  const recommendationTone =
    recommendation === 'Strong Hire'
      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-800 dark:text-emerald-200'
      : recommendation === 'Hire'
        ? 'bg-amber-500/15 border-amber-400/40 text-amber-800 dark:text-amber-100'
        : 'bg-rose-500/15 border-rose-400/40 text-rose-800 dark:text-rose-100';

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "interview_report.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 px-5 py-12 pb-32 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-65">
        <div className="absolute left-10 top-10 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-8 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
      </div>

      <div className="mb-12 space-y-4 text-center">
        <h1 className="bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent dark:from-slate-100 dark:to-slate-400 md:text-5xl">
          Evaluation Report
        </h1>
        <p className="text-lg text-slate-700 dark:text-slate-300">AI-generated performance analysis across every interview round</p>
        <div className={`mx-auto inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${recommendationTone}`}>
          Recommendation: {recommendation}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Score Card */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-slate-400/50 bg-white/95 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-slate-950/60 md:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-amber-400/10" />
          <div className="relative z-10">
            <h2 className="mb-6 text-xl font-medium text-slate-700 dark:text-slate-200">Overall Score</h2>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-300 dark:text-white/10" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                  className="text-cyan-400" strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 300' }}
                  animate={{ strokeDasharray: `${(report.score / 10) * 283} 300` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-slate-900 dark:text-white">{report.score.toFixed(1)}</span>
                <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">out of 10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback & Rounds */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-400/50 bg-white/95 p-8 backdrop-blur-xl dark:border-white/15 dark:bg-slate-950/60">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              AI Feedback
            </h3>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              {report.feedback}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(report.roundScores || {}).map(([round, score]) => (
              <div key={round} className="rounded-2xl border border-slate-400/50 bg-white/95 p-6 dark:border-white/10 dark:bg-black/30">
                <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">{round} Round</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{Number(score).toFixed(1)}<span className="text-lg text-slate-600 dark:text-white/30">/10</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-3xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/14 to-transparent p-8 backdrop-blur-xl">
          <h3 className="mb-6 flex items-center gap-2 text-xl font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            Key Strengths
          </h3>
          <ul className="space-y-4">
            {(report.strengths || []).map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                <span className="leading-relaxed text-slate-800 dark:text-slate-200">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="rounded-3xl border border-rose-400/35 bg-gradient-to-br from-rose-500/12 to-transparent p-8 backdrop-blur-xl">
          <h3 className="mb-6 flex items-center gap-2 text-xl font-semibold text-rose-700 dark:text-rose-300">
            <XCircle className="h-5 w-5" />
            Areas for Improvement
          </h3>
          <ul className="space-y-4">
            {(report.weaknesses || []).map((w, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />
                <span className="leading-relaxed text-slate-800 dark:text-slate-200">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Plan */}
      <div className="rounded-3xl border border-slate-400/50 bg-white/95 p-8 backdrop-blur-xl dark:border-white/15 dark:bg-slate-950/60">
        <h3 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">Recommended Action Plan</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(report.improvementPlan || []).map((plan, i) => (
            <div key={i} className="flex items-start gap-4 rounded-2xl border border-slate-400/50 bg-white/95 p-5 dark:border-white/10 dark:bg-black/35">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-700 dark:text-cyan-300">
                {i + 1}
              </div>
              <p className="pt-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{plan}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
        <Button
          variant="outline"
          onClick={onRetry}
          className="rounded-full px-8 py-4"
        >
          <RotateCcw className="w-5 h-5" />
          Start New Interview
        </Button>
        <Button
          onClick={handleDownload}
          className="rounded-full border-cyan-300/40 bg-gradient-to-r from-cyan-500 to-teal-400 px-8 py-4 font-semibold text-slate-950 shadow-[0_0_30px_rgba(45,212,191,0.4)] transition hover:scale-[1.01] hover:from-cyan-400 hover:to-teal-300"
        >
          <Download className="w-5 h-5" />
          Download Report
        </Button>
      </div>
    </div>
  );
}
