import { useState, useRef } from 'react';
import { UploadCloud, Check, ChevronRight } from 'lucide-react';
import { InterviewConfig } from '@/types';

const PERSONAS = ['CEO', 'CTO', 'HR', 'Engineering Manager'];
const ROUNDS = ['Technical', 'Behavioral', 'HR'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Practice'];

export default function SetupScreen({ onStart }: { onStart: (config: InterviewConfig) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [persona, setPersona] = useState('CTO');
  const [rounds, setRounds] = useState<string[]>(['Technical']);
  const [difficulty, setDifficulty] = useState('Medium');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRoundToggle = (r: string) => {
    setRounds(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setResumeFile(e.dataTransfer.files[0]);
    }
  };

  const handleStart = async () => {
    if (!name || !role) return alert('Please enter name and role');
    
    setIsUploading(true);
    try {
      // @ts-ignore
      if (window.puter && !(await puter.auth.isSignedIn())) {
        // @ts-ignore
        await puter.auth.signIn();
      }
    } catch (e) {
      console.error('Auth failed', e);
      alert('Authentication failed. Please sign in to continue.');
      setIsUploading(false);
      return;
    }

    let resumePath = '';
    if (resumeFile) {
      try {
        // @ts-ignore
        const puterFile = await puter.fs.write(`resume_${Date.now()}_${resumeFile.name}`, resumeFile);
        resumePath = puterFile.path;
      } catch (e) {
        console.error('Failed to upload resume', e);
        alert('Failed to upload resume. Continuing without it.');
      }
    }
    setIsUploading(false);

    onStart({
      name,
      role,
      jd,
      persona,
      rounds,
      difficulty,
      resumePath
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 pb-32">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          AI Interview Setup
        </h1>
        <p className="text-white/50 text-lg">Configure your interview environment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h2 className="text-xl font-semibold text-white/90">Your Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">Target Role</label>
              <input 
                type="text" 
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Senior Frontend Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">Resume (Optional)</label>
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <UploadCloud className="w-8 h-8 text-white/40 mb-2" />
                <p className="text-sm text-white/70">
                  {resumeFile ? resumeFile.name : 'Click or drag to upload'}
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={e => e.target.files && setResumeFile(e.target.files[0])}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col">
          <h2 className="text-xl font-semibold text-white/90 mb-4">Job Description</h2>
          <textarea 
            value={jd}
            onChange={e => setJd(e.target.value)}
            className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none min-h-[200px]"
            placeholder="Paste the job description here to tailor the interview questions..."
          />
        </div>
      </div>

      {/* Persona */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <h2 className="text-xl font-semibold text-white/90">Interviewer Persona</h2>
        <div className="flex flex-wrap gap-3">
          {PERSONAS.map(p => (
            <button
              key={p}
              onClick={() => setPersona(p)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                persona === p 
                  ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-400/50' 
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rounds */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h2 className="text-xl font-semibold text-white/90">Interview Rounds</h2>
          <div className="space-y-3">
            {ROUNDS.map(r => (
              <label key={r} className="flex items-center p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5 transition-all">
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${rounds.includes(r) ? 'bg-blue-500 border-blue-500' : 'border-white/30'}`}>
                  {rounds.includes(r) && <Check className="w-3 h-3 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={rounds.includes(r)} onChange={() => handleRoundToggle(r)} />
                <span className="ml-3 text-white/80">{r}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h2 className="text-xl font-semibold text-white/90">Difficulty</h2>
          <div className="grid grid-cols-2 gap-3">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-4 rounded-xl text-sm font-medium transition-all border ${
                  difficulty === d 
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' 
                    : 'bg-black/20 border-white/10 text-white/60 hover:bg-white/5'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/80 to-transparent flex justify-center pointer-events-none">
        <button
          onClick={handleStart}
          disabled={isUploading || !name || !role}
          className="pointer-events-auto group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:shadow-[0_0_60px_rgba(59,130,246,0.6)] overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            {isUploading ? 'Uploading Resume...' : 'Start Interview'}
            {!isUploading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </span>
          <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_auto] animate-gradient" />
        </button>
      </div>
    </div>
  );
}
