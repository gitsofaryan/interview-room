'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, 
    ShieldCheck, NotebookPen, ClipboardList, Activity 
} from 'lucide-react';
import { 
    waitForPuter, ensurePuterSignedIn, readChatText, 
    readSpeechText, tryParseReport 
} from '@/lib/puter';
import { InterviewConfig, ReportData, TranscriptItem } from '@/types';
import { makeId, formatClock, fallbackQuestion } from '@/lib/utils';
import { getSessionState, setSessionState } from '@/lib/interview-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const MAX_QUESTIONS = 5;
const MAX_TAB_SWITCHES = 5;

export default function InterviewRoom({ config, onEnd }: { config: InterviewConfig; onEnd: (t: TranscriptItem[], r: ReportData) => void }) {
    const [isMicOn, setIsMicOn] = useState(false);
    const [isCamOn, setIsCamOn] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string>('');
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [activeTab, setActiveTab] = useState<'notes' | 'transcript'>('notes');
    const [questionCount, setQuestionCount] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [pasteCount, setPasteCount] = useState(0);
    const [notes, setNotes] = useState('');
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

    const transcriptRef = useRef<TranscriptItem[]>([]);
    const questionCountRef = useRef(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const endedByPolicyRef = useRef(false);

    // Speed-optimized audio context
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [volume, setVolume] = useState(0);

    const progress = useMemo(() => Math.min(100, Math.round((questionCount / MAX_QUESTIONS) * 100)), [questionCount]);

    const appendTranscript = (role: TranscriptItem['role'], text: string) => {
        const item: TranscriptItem = { id: makeId(), role, text };
        const next = [...transcriptRef.current, item];
        transcriptRef.current = next;
        setTranscript(next);
        setSessionState({ transcript: next });
        return next;
    };

    const speak = async (text: string) => {
        setIsAiSpeaking(true);
        try {
            const client = await waitForPuter();
            const result = await client.ai.txt2speech(text);
            const audio = result instanceof HTMLAudioElement ? result : new Audio(result as string);
            await new Promise<void>((resolve) => {
                audio.onended = () => resolve();
                audio.onerror = () => resolve();
                audio.play().catch(() => resolve());
                // Fallback for long speech
                setTimeout(resolve, 12000);
            });
        } catch (err) {
            console.error('Speech failed', err);
        } finally {
            setIsAiSpeaking(false);
        }
    };

    const generateNextQuestion = async (userAnswer: string, fullTranscript: TranscriptItem[]) => {
        if (endedByPolicyRef.current) return;
        setProcessingStatus('Thinking...');

        if (questionCountRef.current >= MAX_QUESTIONS) {
            await endInterview(fullTranscript);
            return;
        }

        const prompt = `Interviewer Persona: ${config.persona}. Role: ${config.role}. 
Context: ${fullTranscript.slice(-4).map(t => `${t.role}: ${t.text}`).join('\n')}
Candidate just said: "${userAnswer}"
Ask ONE concise follow-up question (max 2 sentences). Be natural and fast.`;

        const client = await waitForPuter();
        const response = await client.ai.chat(prompt);
        const nextQ = readChatText(response) || fallbackQuestion(config);

        appendTranscript('interviewer', nextQ);
        setQuestionCount(prev => prev + 1);
        questionCountRef.current += 1;
        await speak(nextQ);
    };

    const processUserAudio = async (audioBlob: Blob) => {
        if (endedByPolicyRef.current || isProcessing) return;

        setIsProcessing(true);
        setProcessingStatus('Transcribing...');
        try {
            const client = await waitForPuter();
            const rawText = await client.ai.speech2txt(audioBlob);
            const text = readSpeechText(rawText).trim();

            if (!text || text.length < 2) {
                appendTranscript('interviewer', "I couldn't hear you clearly. Could you repeat that?");
                await speak("I couldn't hear you clearly. Could you repeat that?");
                return;
            }

            const next = appendTranscript('candidate', text);
            await generateNextQuestion(text, next);
        } catch (error) {
            console.error('Audio processing failed', error);
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsMicOn(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
            setVolume(0);
        }
    };

    const startSilenceDetection = (stream: MediaStream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128; // Smaller for speed
        source.connect(analyser);
        audioContextRef.current = audioContext;
        
        const data = new Uint8Array(analyser.frequencyBinCount);
        const check = () => {
            if (!audioContextRef.current) return;
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b) / data.length;
            setVolume(avg);

            if (avg < 8) {
                if (!silenceTimerRef.current) {
                    silenceTimerRef.current = setTimeout(stopRecording, 1800); // Faster silence detection
                }
            } else {
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
            }
            requestAnimationFrame(check);
        };
        check();
    };

    const toggleMic = () => {
        if (!streamRef.current || isProcessing) return;
        if (isMicOn) { stopRecording(); return; }

        const audioTrack = streamRef.current.getAudioTracks()[0];
        if (!audioTrack) return;

        try {
            const micStream = new MediaStream([audioTrack.clone()]);
            const recorder = new MediaRecorder(micStream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];
            recorder.ondataavailable = e => e.data.size > 0 && audioChunksRef.current.push(e.data);
            recorder.onstop = () => {
                micStream.getTracks().forEach(t => t.stop());
                processUserAudio(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsMicOn(true);
            startSilenceDetection(micStream);
        } catch (err) {
            console.error('Mic failed', err);
        }
    };

    const endInterview = async (finalTranscript = transcriptRef.current) => {
        setIsProcessing(true);
        setProcessingStatus('Generating Report...');
        try {
            const history = finalTranscript.map(t => `${t.role}: ${t.text}`).join('\n');
            const prompt = `Evaluate interview for ${config.role}. History:\n${history}\nReturn JSON: {score: number, recommendation: string, strengths: [], weaknesses: [], feedback: string, roundScores: {}, improvementPlan: []}`;
            const client = await waitForPuter();
            const response = await client.ai.chat(prompt);
            const report = tryParseReport(readChatText(response));
            onEnd(finalTranscript, report);
        } catch (err) {
            console.error('Evaluation failed', err);
            onEnd(finalTranscript, { score: 0, recommendation: 'No Hire', strengths: [], weaknesses: [], feedback: 'Evaluation failed.', roundScores: {}, improvementPlan: [] });
        }
    };

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            await ensurePuterSignedIn();
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
            if (!mounted) return;
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            
            setIsProcessing(true);
            setProcessingStatus('Starting...');
            const greeting = await (await waitForPuter()).ai.chat(`You are ${config.persona} interviewing ${config.name} for ${config.role}. Give a 1-sentence fast greeting.`);
            const text = readChatText(greeting) || `Hello ${config.name}, let's start.`;
            if (mounted) {
                appendTranscript('interviewer', text);
                setQuestionCount(1);
                questionCountRef.current = 1;
                setIsProcessing(false);
                await speak(text);
            }
        };
        init();
        return () => { mounted = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
    }, [config]);

    useEffect(() => {
        const timer = setInterval(() => setTimeElapsed(p => p + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex h-screen w-full flex-col gap-4 p-4 lg:flex-row bg-slate-50 dark:bg-slate-950">
            <main className="flex flex-1 flex-col gap-4 overflow-hidden">
                <Card className="flex items-center justify-between p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="animate-pulse text-sky-500 border-sky-500/20 bg-sky-500/5">LIVE</Badge>
                        <h2 className="text-sm font-semibold">{config.role} // {config.persona}</h2>
                    </div>
                    <p className="font-mono text-sm font-medium">{formatClock(timeElapsed)}</p>
                </Card>

                <div className="relative flex-1 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.1),transparent_70%)]" />
                    
                    <motion.div 
                        animate={{ 
                            scale: isAiSpeaking ? [1, 1.05, 1] : isMicOn ? [1, 1 + (volume/100), 1] : 1,
                            opacity: isProcessing ? 0.5 : 1
                        }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-sky-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-sky-500/20">
                            {config.persona[0]}
                        </div>
                        <p className="mt-4 text-xs font-medium text-slate-500 uppercase tracking-widest">
                            {isProcessing ? processingStatus : isAiSpeaking ? 'AI Speaking' : isMicOn ? 'Listening' : 'Ready'}
                        </p>
                    </motion.div>

                    <div className="absolute bottom-4 right-4 w-48 aspect-video rounded-xl border-2 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-slate-200">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" style={{transform: 'scaleX(-1)'}} />
                        {!isCamOn && <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800"><VideoOff className="text-slate-400" /></div>}
                    </div>

                    <div className="absolute bottom-24 inset-x-0 flex justify-center px-6">
                        <AnimatePresence mode="wait">
                            {transcript.slice(-1).map(t => (
                                <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border px-4 py-2 rounded-lg text-center shadow-lg">
                                    <p className="text-xs font-semibold text-sky-500 mb-1 uppercase tracking-tight">{t.role}</p>
                                    <p className="text-sm font-medium leading-tight">{t.text}</p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 p-2">
                    <Button size="lg" onClick={toggleMic} disabled={isProcessing || isAiSpeaking} className={`rounded-full w-14 h-14 ${isMicOn ? 'bg-red-500 hover:bg-red-600' : 'bg-sky-500 hover:bg-sky-600'}`}>
                        {isMicOn ? <MicOff /> : <Mic />}
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => { streamRef.current?.getVideoTracks().forEach(t => t.enabled = !t.enabled); setIsCamOn(!isCamOn); }} className="rounded-full w-14 h-14">
                        {isCamOn ? <Video /> : <VideoOff />}
                    </Button>
                    <div className="w-px h-8 bg-slate-200 mx-2" />
                    <Button variant="destructive" onClick={() => endInterview()} disabled={isProcessing} className="rounded-full px-6">
                        {isProcessing ? <Loader2 className="animate-spin mr-2" size={18} /> : <PhoneOff className="mr-2" size={18} />}
                        End
                    </Button>
                </div>
            </main>

            <aside className="w-full lg:w-80 flex flex-col gap-4">
                <Card className="p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-slate-500">PROGRESS</p>
                        <p className="text-xs font-bold text-sky-500">{progress}%</p>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                </Card>

                <Card className="flex-1 flex flex-col overflow-hidden shadow-sm">
                    <div className="flex border-b">
                        <button onClick={() => setActiveTab('notes')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'notes' ? 'text-sky-500 border-b-2 border-sky-500' : 'text-slate-400'}`}>Notes</button>
                        <button onClick={() => setActiveTab('transcript')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'transcript' ? 'text-sky-500 border-b-2 border-sky-500' : 'text-slate-400'}`}>Log</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'notes' ? (
                            <Textarea className="h-full min-h-[200px] border-none focus-visible:ring-0 p-0 text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Live observations..." />
                        ) : (
                            <div className="space-y-3">
                                {transcript.map(t => (
                                    <div key={t.id} className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t.role}</p>
                                        <p className={`text-xs p-2 rounded-lg ${t.role === 'candidate' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300' : 'bg-slate-100 dark:bg-slate-800'}`}>{t.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </aside>
        </div>
    );
}
