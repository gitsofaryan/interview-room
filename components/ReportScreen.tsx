import { motion } from 'motion/react';
import { Download, RotateCcw, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { ReportData } from '@/types';

export default function ReportScreen({ report, onRetry }: { report: ReportData, onRetry: () => void }) {
  
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
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 pb-32">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Evaluation Report
        </h1>
        <p className="text-white/50 text-lg">Detailed analysis of your interview performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
          <div className="relative z-10">
            <h2 className="text-xl font-medium text-white/70 mb-6">Overall Score</h2>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-white/10" strokeWidth="8" />
                <motion.circle 
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor" 
                  className="text-blue-500" strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 300' }}
                  animate={{ strokeDasharray: `${(report.score / 10) * 283} 300` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-white">{report.score}</span>
                <span className="text-white/50 text-sm mt-1">out of 10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback & Rounds */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
            <h3 className="text-xl font-semibold text-white/90 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              AI Feedback
            </h3>
            <p className="text-white/70 leading-relaxed">
              {report.feedback}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(report.roundScores || {}).map(([round, score]) => (
              <div key={round} className="bg-black/20 border border-white/5 rounded-2xl p-6">
                <div className="text-sm text-white/50 mb-2">{round} Round</div>
                <div className="text-2xl font-bold text-white">{score as number}<span className="text-white/30 text-lg">/10</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-3xl p-8 backdrop-blur-xl">
          <h3 className="text-xl font-semibold text-green-400 mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Key Strengths
          </h3>
          <ul className="space-y-4">
            {(report.strengths || []).map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                <span className="text-white/80 leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-3xl p-8 backdrop-blur-xl">
          <h3 className="text-xl font-semibold text-red-400 mb-6 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Areas for Improvement
          </h3>
          <ul className="space-y-4">
            {(report.weaknesses || []).map((w, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                <span className="text-white/80 leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Plan */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
        <h3 className="text-xl font-semibold text-white/90 mb-6">Recommended Action Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(report.improvementPlan || []).map((plan, i) => (
            <div key={i} className="bg-black/20 border border-white/5 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                {i + 1}
              </div>
              <p className="text-white/80 text-sm leading-relaxed pt-1">{plan}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
        <button
          onClick={onRetry}
          className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Start New Interview
        </button>
        <button
          onClick={handleDownload}
          className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download Report
        </button>
      </div>
    </div>
  );
}
