import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, AlertTriangle, Loader2 } from 'lucide-react';
import { InterviewConfig, TranscriptItem, ReportData } from '@/types';

export default function InterviewRoom({ config, onEnd }: { config: InterviewConfig, onEnd: (t: TranscriptItem[], r: ReportData) => void }) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [questionCount, setQuestionCount] = useState(1);
  const [flags, setFlags] = useState<string[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<'notes' | 'transcript'>('notes');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const MAX_QUESTIONS = 5;

  // Helper to extract text from Puter AI response safely
  const extractText = (res: any): string => {
    if (typeof res === 'string') return res;
    if (res?.message?.content) {
      if (Array.isArray(res.message.content)) {
        return res.message.content.map((c: any) => c.text || '').join('');
      }
      return res.message.content;
    }
    if (res?.text) return res.text;
    return JSON.stringify(res);
  };

  // Setup Webcam
  useEffect(() => {
    let mounted = true;
    const setupMedia = async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err) {
          console.warn("Video+Audio failed, trying Audio only", err);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            setIsCamOn(false);
          } catch (err2) {
            console.warn("Audio only failed", err2);
            stream = new MediaStream();
            setIsCamOn(false);
          }
        }

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current && stream.getVideoTracks().length > 0) {
          videoRef.current.srcObject = stream;
        }
        // Mute the audio track initially so we don't record until user clicks mic
        stream.getAudioTracks().forEach(t => t.enabled = false);
      } catch (err) {
        console.error("Failed to get media", err);
      }
    };
    setupMedia();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Proctoring
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setFlags(prev => [...prev, 'Tab switched']);
        // @ts-ignore
        if (window.puter) puter.kv.set("tab_switch", true);
      }
    };
    const handlePaste = () => {
      setFlags(prev => [...prev, 'Paste detected']);
      // @ts-ignore
      if (window.puter) puter.kv.set("paste_detected", true);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Initial AI Greeting
  useEffect(() => {
    const startInterview = async () => {
      setIsProcessing(true);
      try {
        const prompt = `
You are a ${config.persona} interviewer. The candidate is ${config.name} applying for ${config.role}.
Job Description: ${config.jd}
Rounds: ${config.rounds.join(', ')}
Difficulty: ${config.difficulty}

Start the interview by introducing yourself briefly and asking the very first question.
Keep it concise and natural, like a real conversation.
`;
        // @ts-ignore
        const res = await puter.ai.chat(prompt, { model: 'claude-3-5-sonnet' });
        const text = extractText(res);
        
        addTranscript('interviewer', text);
        await playAiVoice(text);
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };
    startInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTranscript = (role: 'interviewer' | 'candidate', text: string) => {
    setTranscript(prev => [...prev, { id: Math.random().toString(), role, text }]);
  };

  const playAiVoice = async (text: string) => {
    setIsAiSpeaking(true);
    try {
      // @ts-ignore
      const audioEl = await puter.ai.txt2speech(text);
      // Wait for audio to finish playing
      await new Promise((resolve) => {
        audioEl.onended = resolve;
        audioEl.onerror = resolve;
        audioEl.play().catch((err: any) => {
          console.error("Audio play failed (autoplay blocked?)", err);
          resolve(null);
        });
      });
    } catch (err) {
      console.error("TTS failed", err);
    } finally {
      setIsAiSpeaking(false);
    }
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    
    if (isMicOn) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current.getAudioTracks().forEach(t => t.enabled = false);
      setIsMicOn(false);
    } else {
      // Start recording
      streamRef.current.getAudioTracks().forEach(t => t.enabled = true);
      const recorder = new MediaRecorder(streamRef.current);
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processUserAudio(audioBlob);
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsMicOn(true);
    }
  };

  const toggleCam = () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOn(videoTrack.enabled);
    }
  };

  const processUserAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // @ts-ignore
      const text = await puter.ai.speech2txt(audioBlob);
      if (text && text.trim().length > 0) {
        addTranscript('candidate', text);
        await generateNextQuestion(text);
      }
    } catch (err) {
      console.error("STT failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateNextQuestion = async (userAnswer: string) => {
    if (questionCount >= MAX_QUESTIONS) {
      await endInterview();
      return;
    }

    const historyText = transcript.map(t => `${t.role === 'interviewer' ? config.persona : 'Candidate'}: ${t.text}`).join('\n');
    
    const prompt = `
You are a ${config.persona} interviewer.
Round: ${config.rounds.join(', ')}
Difficulty: ${config.difficulty}

Previous conversation:
${historyText}
Candidate just answered: ${userAnswer}

Ask the next question. It can be a follow-up to their answer or a new question. Keep it concise.
`;
    try {
      // @ts-ignore
      const res = await puter.ai.chat(prompt, { model: 'claude-3-5-sonnet' });
      const nextQ = extractText(res);
      
      addTranscript('interviewer', nextQ);
      setQuestionCount(prev => prev + 1);
      await playAiVoice(nextQ);
    } catch (err) {
      console.error(err);
    }
  };

  const endInterview = async () => {
    setIsProcessing(true);
    try {
      const historyText = transcript.map(t => `${t.role === 'interviewer' ? config.persona : 'Candidate'}: ${t.text}`).join('\n');
      const prompt = `
Evaluate the following interview for the role of ${config.role}.
Candidate Name: ${config.name}
Interviewer Persona: ${config.persona}

Conversation:
${historyText}

Provide a comprehensive evaluation in JSON format with exactly this structure:
{
  "score": 8.5,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "feedback": "Overall feedback paragraph...",
  "roundScores": {
    "Technical": 8.0,
    "Behavioral": 9.0
  },
  "improvementPlan": ["step 1", "step 2"]
}
Only output valid JSON.
`;
      // @ts-ignore
      const res = await puter.ai.chat(prompt, { model: 'claude-3-5-sonnet' });
      let jsonStr = extractText(res);
      // Clean up markdown block if present
      if (jsonStr.startsWith('\`\`\`json')) {
        jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      }
      const reportData: ReportData = JSON.parse(jsonStr);
      
      // Save to Puter FS
      try {
        // @ts-ignore
        await puter.fs.write(`interview_report_${Date.now()}.json`, JSON.stringify({ config, transcript, report: reportData, flags }));
      } catch (e) {
        console.error("Failed to save report to FS", e);
      }

      onEnd(transcript, reportData);
    } catch (err) {
      console.error("Evaluation failed", err);
      alert("Failed to generate evaluation. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-full bg-[#0B0F14] flex flex-col md:flex-row overflow-hidden">
      {/* Main Video Area */}
      <div className="flex-1 relative flex flex-col p-4 gap-4">
        {/* Top Bar */}
        <div className="flex justify-between items-center px-4 py-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-medium text-white/90">{config.role} Interview</span>
          </div>
          <div className="font-mono text-white/70">{formatTime(timeElapsed)}</div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 relative rounded-3xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center">
          {/* AI Avatar / Waveform */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div 
              animate={{ 
                scale: isAiSpeaking ? [1, 1.1, 1] : 1,
                opacity: isAiSpeaking ? [0.5, 0.8, 0.5] : 0.3
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-48 h-48 rounded-full bg-blue-500/20 blur-3xl absolute"
            />
            <div className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)]">
              <span className="text-4xl font-bold text-white">{config.persona[0]}</span>
            </div>
            <p className="mt-6 text-white/60 font-medium tracking-widest uppercase text-sm">
              {isAiSpeaking ? 'Speaking...' : 'Listening...'}
            </p>
          </div>

          {/* User Webcam (PiP) */}
          <div className="absolute bottom-6 right-6 w-48 aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`} 
              style={{ transform: 'scaleX(-1)' }}
            />
            {!isCamOn && (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <VideoOff className="w-8 h-8 text-white/30" />
              </div>
            )}
          </div>

          {/* Live Transcript Overlay (Captions) */}
          <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center pointer-events-none px-4 z-20">
            <AnimatePresence mode="popLayout">
              {transcript.slice(-1).map(t => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-black/80 backdrop-blur-md rounded-2xl px-8 py-4 max-w-3xl text-center shadow-2xl border border-white/10"
                >
                  <p className="text-white/50 text-xs font-semibold mb-1 uppercase tracking-wider">
                    {t.role === 'interviewer' ? config.persona : 'You'}
                  </p>
                  <p className="text-white text-lg md:text-xl leading-relaxed">
                    {t.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="h-20 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center gap-4 px-6">
          <button 
            onClick={toggleMic}
            disabled={isProcessing || isAiSpeaking}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all relative ${
              isMicOn 
                ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            } disabled:opacity-50`}
          >
            {isMicOn && (
              <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75"></span>
            )}
            <span className="relative z-10">
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </span>
          </button>
          
          <button 
            onClick={toggleCam}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isCamOn ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {isCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <div className="w-px h-8 bg-white/10 mx-2" />

          <button 
            onClick={endInterview}
            disabled={isProcessing}
            className="px-6 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PhoneOff className="w-5 h-5" />}
            End Interview
          </button>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full md:w-80 bg-white/5 border-l border-white/10 flex flex-col backdrop-blur-xl">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white/90 mb-2">Progress</h3>
          <div className="flex items-center justify-between text-sm text-white/60 mb-3">
            <span>Question {questionCount} of {MAX_QUESTIONS}</span>
            <span>{Math.round((questionCount / MAX_QUESTIONS) * 100)}%</span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${(questionCount / MAX_QUESTIONS) * 100}%` }}
            />
          </div>
        </div>

        {flags.length > 0 && (
          <div className="p-4 mx-4 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-400">Proctoring Flags</h4>
              <ul className="text-xs text-red-400/70 mt-1 list-disc list-inside">
                {flags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/10 mt-2">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'notes' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/50 hover:text-white/80'}`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'transcript' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/50 hover:text-white/80'}`}
          >
            Transcript
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'notes' ? (
            <div className="flex-1 p-6 flex flex-col">
              <textarea 
                value={notes}
                onChange={e => {
                  setNotes(e.target.value);
                  // @ts-ignore
                  if (window.puter) puter.kv.set("notes", e.target.value);
                }}
                className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                placeholder="Jot down your thoughts here..."
              />
            </div>
          ) : (
            <div className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-hide">
              {transcript.map(t => (
                <div key={t.id} className={`flex flex-col ${t.role === 'candidate' ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-white/40 mb-1">{t.role === 'interviewer' ? config.persona : 'You'}</span>
                  <div className={`p-3 rounded-xl max-w-[90%] text-sm ${t.role === 'candidate' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/90'}`}>
                    {t.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
