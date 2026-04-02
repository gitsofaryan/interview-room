'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ClipboardList, Loader2, Mic, MicOff, NotebookPen, PhoneOff, Video, VideoOff } from 'lucide-react';
import { InterviewConfig, ReportData, TranscriptItem } from '@/types';
import { ensurePuterSignedIn, readChatText, readSpeechText, tryParseReport, waitForPuter } from '@/lib/puter';
import { getSessionState, setSessionState } from '@/lib/interview-session';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const MAX_QUESTIONS = 5;
const MAX_TAB_SWITCHES = 5;
const AI_RESPONSE_TIMEOUT_MS = 20000;
const AI_MAX_RETRIES = 2;

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatClock = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
};

const fallbackQuestion = (config: InterviewConfig) =>
    `Hi ${config.name}, I am your ${config.persona} interviewer today. Let us start with this: tell me about your experience relevant to ${config.role}.`;

export default function InterviewRoom({ config, onEnd }: { config: InterviewConfig; onEnd: (t: TranscriptItem[], r: ReportData) => void }) {
    const [isMicOn, setIsMicOn] = useState(false);
    const [isCamOn, setIsCamOn] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
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

    const progress = useMemo(() => Math.min(100, Math.round((questionCount / MAX_QUESTIONS) * 100)), [questionCount]);

    const setTranscriptWithRef = (next: TranscriptItem[]) => {
        transcriptRef.current = next;
        setTranscript(next);
        setSessionState({ transcript: next });
    };

    const appendTranscript = (role: TranscriptItem['role'], text: string) => {
        const item: TranscriptItem = {
            id: makeId(),
            role,
            text,
        };
        const next = [...transcriptRef.current, item];
        setTranscriptWithRef(next);
        return next;
    };

    const speak = async (text: string) => {
        try {
            setIsAiSpeaking(true);
            const client = await waitForPuter();
            console.log('[TTS] Starting text-to-speech for:', text.substring(0, 50));

            const result = await client.ai.txt2speech(text);
            console.log('[TTS] Result type:', typeof result, 'Is Audio?', result instanceof HTMLAudioElement);

            // Handle both Audio element and URL responses
            let audio: HTMLAudioElement;
            if (result instanceof HTMLAudioElement) {
                audio = result;
            } else if (typeof result === 'string') {
                // Result is a URL
                audio = new Audio(result);
            } else if (result && typeof result === 'object' && 'play' in result) {
                // Result is already an audio-like object
                audio = result as HTMLAudioElement;
            } else {
                console.warn('[TTS] Unexpected result type:', result);
                return;
            }

            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn('[TTS] Audio playback timeout');
                    resolve();
                }, 15000);

                audio.onended = () => {
                    clearTimeout(timeout);
                    console.log('[TTS] Audio ended normally');
                    resolve();
                };
                audio.onerror = (err) => {
                    clearTimeout(timeout);
                    console.error('[TTS] Audio error:', err);
                    resolve();
                };

                const playPromise = audio.play();
                if (playPromise && typeof playPromise.then === 'function') {
                    playPromise
                        .then(() => console.log('[TTS] Audio playing'))
                        .catch((err) => {
                            console.error('[TTS] Play error:', err);
                        });
                } else {
                    console.log('[TTS] Play returned non-promise');
                }
            });
        } catch (error) {
            console.error('[TTS] Exception:', error);
        } finally {
            setIsAiSpeaking(false);
        }
    };

    const terminateDueToIntegrity = () => {
        if (endedByPolicyRef.current) return;
        endedByPolicyRef.current = true;

        const warningText =
            'Interview ended due to repeated tab switching. Please request admin to reschedule your interview.';
        const finalTranscript = appendTranscript('interviewer', warningText);

        const report: ReportData = {
            score: 0,
            recommendation: 'No Hire',
            strengths: [],
            weaknesses: ['Interview integrity policy was violated due to repeated tab switching.'],
            feedback: warningText,
            roundScores: {},
            improvementPlan: ['Contact admin and request interview reschedule.'],
        };

        setSessionState({
            report,
            endedByIntegrity: true,
            transcript: finalTranscript,
            tabSwitchCount,
            pasteCount,
            notes,
        });

        alert('Interview ended. Please request admin to reschedule.');
        onEnd(finalTranscript, report);
    };

    const askInterviewer = async (prompt: string): Promise<string> => {
        console.log('[AI] Sending prompt:', prompt.substring(0, 100));
        const client = await waitForPuter();

        for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt += 1) {
            try {
                const timeoutPromise = new Promise<string>((_, reject) => {
                    setTimeout(() => reject(new Error('AI request timeout')), AI_RESPONSE_TIMEOUT_MS);
                });

                const responsePromise = (async () => {
                    const response = await client.ai.chat(prompt);
                    return readChatText(response);
                })();

                const text = (await Promise.race([responsePromise, timeoutPromise])).trim();
                if (text.length > 0) {
                    return text;
                }
                console.warn(`[AI] Empty response on attempt ${attempt}`);
            } catch (error) {
                console.warn(`[AI] Attempt ${attempt} failed`, error);
            }
        }

        return '';
    };

    const endInterview = async (finalTranscript: TranscriptItem[] = transcriptRef.current) => {
        if (endedByPolicyRef.current) {
            return;
        }

        setIsProcessing(true);
        try {
            const history = finalTranscript
                .map((item) => `${item.role === 'interviewer' ? config.persona : 'Candidate'}: ${item.text}`)
                .join('\n');

            const evaluationPrompt = `
Evaluate this interview for ${config.role}.
Candidate: ${config.name}
Persona: ${config.persona}
Rounds: ${config.rounds.join(', ')}
Difficulty: ${config.difficulty}

Conversation:
${history}

Return only JSON with:
{
  "score": 8.2,
  "recommendation": "Hire",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "feedback": "...",
  "roundScores": {"Technical": 8.0},
  "improvementPlan": ["..."]
}
`;

            const response = await askInterviewer(evaluationPrompt);
            const report: ReportData = response
                ? tryParseReport(response)
                : {
                    score: 0,
                    recommendation: 'No Hire',
                    strengths: [],
                    weaknesses: ['Evaluation model response was unavailable.'],
                    feedback: 'Evaluation could not be completed automatically.',
                    roundScores: {},
                    improvementPlan: ['Retry interview evaluation from setup.'],
                };

            setSessionState({
                transcript: finalTranscript,
                report,
                notes,
                tabSwitchCount,
                pasteCount,
            });

            try {
                const client = await waitForPuter();
                await client.fs.write(
                    `interview_report_${Date.now()}.json`,
                    JSON.stringify(
                        {
                            config,
                            transcript: finalTranscript,
                            notes,
                            tabSwitchCount,
                            pasteCount,
                            report,
                        },
                        null,
                        2
                    )
                );
            } catch (error) {
                console.error('Could not persist report file', error);
            }

            onEnd(finalTranscript, report);
        } catch (error) {
            console.error('Evaluation failed', error);
            const fallback: ReportData = {
                score: 0,
                recommendation: 'No Hire',
                strengths: [],
                weaknesses: ['Automatic evaluation failed unexpectedly.'],
                feedback: 'Interview completed but report generation failed. Please request admin to re-evaluate.',
                roundScores: {},
                improvementPlan: ['Request admin support for evaluation rerun.'],
            };
            setSessionState({ report: fallback, transcript: finalTranscript, notes, tabSwitchCount, pasteCount });
            onEnd(finalTranscript, fallback);
        } finally {
            setIsProcessing(false);
        }
    };

    const generateNextQuestion = async (userAnswer: string, fullTranscript: TranscriptItem[]) => {
        if (endedByPolicyRef.current) return;

        if (questionCountRef.current >= MAX_QUESTIONS) {
            console.log('[Q-GEN] Max questions reached, ending interview');
            await endInterview(fullTranscript);
            return;
        }

        const history = fullTranscript
            .map((item) => `${item.role === 'interviewer' ? config.persona : 'Candidate'}: ${item.text}`)
            .join('\n');

        const prompt = `You are interviewing a candidate for ${config.role}. Be conversational and natural, like a real interviewer would be.

Candidate: ${config.name}
Difficulty: ${config.difficulty}

Recent exchange:
${history}

The candidate just said: "${userAnswer}"

Ask ONE follow-up question that:
1. Probes deeper into what they said
2. Sounds natural and conversational
3. Is appropriately challenging for a ${config.difficulty} level
4. Is concise (1-2 sentences max)

Respond with ONLY the question, nothing else.`;

        console.log('[Q-GEN] Generating question', questionCount + 1);
        const nextQuestion = await askInterviewer(prompt);
        const safeQuestion = nextQuestion && nextQuestion.trim().length > 8
            ? nextQuestion
            : `Can you walk me through a specific example from your recent work that showcases your ${config.role} skills?`;
        appendTranscript('interviewer', safeQuestion);
        setQuestionCount((prev) => {
            const next = Math.min(MAX_QUESTIONS, prev + 1);
            questionCountRef.current = next;
            return next;
        });
        await speak(safeQuestion);
    };

    const processUserAudio = async (audioBlob: Blob) => {
        if (endedByPolicyRef.current) return;

        setIsProcessing(true);
        try {
            console.log('[AUDIO] Processing audio blob:', audioBlob.size, 'bytes');
            const client = await waitForPuter();
            const rawText = await client.ai.speech2txt(audioBlob);
            console.log('[AUDIO] Raw speech2txt response:', rawText);
            const text = readSpeechText(rawText).trim();
            console.log('[AUDIO] Parsed text:', text);

            if (!text || text.length < 2) {
                console.warn('[AUDIO] No text extracted from speech, blob size was:', audioBlob.size);
                appendTranscript('interviewer', 'I couldn\'t catch that - could you please speak up and try again?');
                return;
            }

            const next = appendTranscript('candidate', text);

            // If user just answered the final allowed question, end immediately with report.
            if (questionCountRef.current >= MAX_QUESTIONS) {
                await endInterview(next);
                return;
            }

            await generateNextQuestion(text, next);
        } catch (error) {
            console.error('[AUDIO] Speech to text failed', error);
            appendTranscript('interviewer', 'Audio processing failed. Please retry your answer.');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleMic = () => {
        if (!streamRef.current || endedByPolicyRef.current || isProcessing) return;

        const audioTrack = streamRef.current.getAudioTracks()[0];
        if (!audioTrack) {
            console.error('[MIC] No audio track available');
            alert('Microphone not available.');
            return;
        }

        if (isMicOn) {
            console.log('[MIC] Stopping recording');
            mediaRecorderRef.current?.stop();
            setIsMicOn(false);
            return;
        }

        try {
            const clonedAudio = audioTrack.clone();
            const micStream = new MediaStream([clonedAudio]);

            // Try different MIME types for better browser support
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                mimeType = 'audio/wav';
            }

            const recorder = new MediaRecorder(micStream, { mimeType });
            console.log('[MIC] Recording started with MIME type:', mimeType);

            audioChunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    console.log('[MIC] Audio chunk received:', event.data.size, 'bytes');
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onerror = (event) => {
                console.error('[MIC] Recording error:', event.error);
                clonedAudio.stop();
                setIsMicOn(false);
            };

            recorder.onstop = async () => {
                console.log('[MIC] Recording stopped, total chunks:', audioChunksRef.current.length);
                clonedAudio.stop();
                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                console.log('[MIC] Blob created:', blob.size, 'bytes, type:', blob.type);
                if (blob.size > 0) {
                    await processUserAudio(blob);
                } else {
                    console.warn('[MIC] Blob is empty!');
                    appendTranscript('interviewer', 'The recording was empty. Please try again.');
                }
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsMicOn(true);
            console.log('[MIC] Microphone ready for recording');
        } catch (error) {
            console.error('[MIC] Failed to start recording:', error);
            alert('Failed to start microphone. Check browser permissions.');
        }
    };

    const toggleCam = () => {
        const videoTrack = streamRef.current?.getVideoTracks()[0];
        if (!videoTrack) return;
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                console.log('[INIT] Starting interview initialization...');
                await ensurePuterSignedIn();
                console.log('[INIT] User signed in');

                const saved = getSessionState();
                if (saved.notes) setNotes(saved.notes);
                if (saved.tabSwitchCount) setTabSwitchCount(saved.tabSwitchCount);
                if (saved.pasteCount) setPasteCount(saved.pasteCount);

                let stream: MediaStream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    console.log('[INIT] Media stream acquired (video + audio)');
                } catch {
                    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    setIsCamOn(false);
                    console.log('[INIT] Media stream acquired (audio only, video failed)');
                }

                if (!mounted) {
                    stream.getTracks().forEach((t) => t.stop());
                    console.log('[INIT] Component unmounted, stopping stream');
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current && stream.getVideoTracks().length > 0) {
                    videoRef.current.srcObject = stream;
                }

                setIsProcessing(true);
                console.log('[INIT] Generating first greeting...');

                const firstPrompt = `You are interviewing a candidate for a ${config.role} role. Start with a warm, personable greeting.

Candidate Name: ${config.name}
Difficulty Level: ${config.difficulty}
Interview Style: ${config.persona}

Greet them by name and ask an opening question about their experience with ${config.role}. Be conversational and welcoming. Keep it to 2-3 sentences max.

Respond with ONLY the greeting and question, nothing else.`;

                console.log('[INIT] First prompt prepared');
                const first = await askInterviewer(firstPrompt);
                const firstQuestion = first && first.trim().length > 8 ? first : fallbackQuestion(config);
                console.log('[INIT] Using greeting:', firstQuestion.substring(0, 100));

                if (mounted) {
                    appendTranscript('interviewer', firstQuestion);
                    setQuestionCount(1);
                    questionCountRef.current = 1;
                    console.log('[INIT] Greeting added to transcript, speaking...');
                    try {
                        await speak(firstQuestion);
                        console.log('[INIT] Greeting spoken successfully');
                    } catch (speakErr) {
                        console.error('[INIT] Greeting TTS failed:', speakErr);
                    }
                }
            } catch (error) {
                console.error('[INIT] Failed to start interview', error);
                if (mounted) {
                    const backup = fallbackQuestion(config);
                    appendTranscript('interviewer', backup);
                    setQuestionCount(1);
                    questionCountRef.current = 1;
                    await speak(backup).catch(err => console.error('[INIT] Fallback speak failed', err));
                }
            } finally {
                if (mounted) {
                    setIsProcessing(false);
                }
            }
        };

        init();

        return () => {
            mounted = false;
            mediaRecorderRef.current?.stop();
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, [config]);

    useEffect(() => {
        questionCountRef.current = questionCount;
    }, [questionCount]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeElapsed((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const handleVisibility = () => {
            if (!document.hidden || endedByPolicyRef.current) return;

            setTabSwitchCount((prev) => {
                const next = prev + 1;
                setSessionState({ tabSwitchCount: next });
                if (next >= MAX_TAB_SWITCHES) {
                    terminateDueToIntegrity();
                }
                return next;
            });
        };

        const handlePaste = () => {
            setPasteCount((prev) => {
                const next = prev + 1;
                setSessionState({ pasteCount: next });
                return next;
            });
        };

        document.addEventListener('visibilitychange', handleVisibility);
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            document.removeEventListener('paste', handlePaste);
        };
    }, [tabSwitchCount, pasteCount]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    useEffect(() => {
        setSessionState({ notes, tabSwitchCount, pasteCount });
    }, [notes, tabSwitchCount, pasteCount]);

    return (
        <div className="flex h-full w-full flex-col gap-4 p-4 lg:flex-row">
            <section className="flex min-h-0 flex-1 flex-col gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Badge>Live Interview</Badge>
                            <p className="text-sm text-slate-700 dark:text-slate-200">
                                {config.role} • {config.persona}
                            </p>
                        </div>
                        <p className="font-mono text-sm text-slate-600 dark:text-slate-300">{formatClock(timeElapsed)}</p>
                    </div>
                </Card>

                <Card className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_38%_30%,rgba(6,182,212,0.18),transparent_45%),radial-gradient(circle_at_75%_75%,rgba(250,204,21,0.12),transparent_35%)]" />

                    <div className="relative z-10 flex flex-col items-center justify-center">
                        <motion.div
                            animate={{
                                scale: isAiSpeaking ? [1, 1.08, 1] : [1, 1.02, 1],
                                opacity: isAiSpeaking ? [0.35, 0.7, 0.35] : [0.2, 0.32, 0.2],
                            }}
                            transition={{ repeat: Infinity, duration: 2.1 }}
                            className="absolute h-56 w-56 rounded-full bg-cyan-500/30 blur-3xl"
                        />
                        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-cyan-500 to-teal-400 text-3xl font-semibold text-slate-950 shadow-[0_0_50px_rgba(45,212,191,0.35)]">
                            {config.persona[0]}
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
                            {isAiSpeaking ? 'Interviewer speaking' : 'Listening'}
                        </p>
                    </div>

                    <div className="absolute bottom-5 right-5 w-48 overflow-hidden rounded-lg border border-slate-300/25 bg-black/60">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`aspect-video w-full object-cover ${!isCamOn ? 'hidden' : ''}`}
                            style={{ transform: 'scaleX(-1)' }}
                        />
                        {!isCamOn ? (
                            <div className="flex aspect-video items-center justify-center text-slate-400">
                                <VideoOff className="h-6 w-6" />
                            </div>
                        ) : null}
                    </div>

                    <div className="pointer-events-none absolute bottom-20 left-0 right-0 flex justify-center px-3">
                        <AnimatePresence mode="popLayout">
                            {transcript.slice(-1).map((entry) => (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="max-w-2xl rounded-md border border-slate-400/20 bg-slate-950/90 px-3 py-2 text-center backdrop-blur-sm"
                                >
                                    <p className="text-[9px] uppercase tracking-wider text-slate-400/70">
                                        {entry.role === 'interviewer' ? config.persona : 'You'}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-100 leading-snug">{entry.text}</p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </Card>

                <Card className="p-3">
                    <div className="flex items-center justify-center gap-3">
                        <Button type="button" size="icon" onClick={toggleMic} disabled={isProcessing || endedByPolicyRef.current}>
                            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </Button>

                        <Button type="button" size="icon" variant="outline" onClick={toggleCam}>
                            {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                        </Button>

                        <Separator orientation="vertical" className="h-7" />

                        <Button type="button" variant="destructive" onClick={() => endInterview()} disabled={isProcessing || endedByPolicyRef.current}>
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
                            End Interview
                        </Button>
                    </div>
                </Card>
            </section>

            <aside className="flex w-full min-h-0 flex-col gap-3 lg:w-96">
                <Card>
                    <CardContent className="space-y-4 p-4">
                        <div>
                            <div className="mb-1 flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
                                <span>
                                    Question {Math.min(questionCount, MAX_QUESTIONS)} of {MAX_QUESTIONS}
                                </span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} />
                        </div>

                        <div className="space-y-1 rounded-lg border border-amber-400/35 bg-amber-500/12 p-3 text-xs text-amber-900 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-100">
                            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                                <AlertTriangle className="h-4 w-4" />
                                Integrity Monitor
                            </div>
                            <p>Tab switches: {tabSwitchCount}/{MAX_TAB_SWITCHES}</p>
                            <p>Paste actions: {pasteCount}</p>
                            <p className="text-amber-800/85 dark:text-amber-200/85">At 5 tab switches, interview ends and requires admin reschedule.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex min-h-0 flex-1 flex-col">
                    <div className="flex border-b border-slate-300/20">
                        <button
                            type="button"
                            onClick={() => setActiveTab('notes')}
                            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm ${activeTab === 'notes' ? 'bg-cyan-500/15 text-cyan-900 dark:bg-slate-800 dark:text-cyan-200' : 'text-slate-700 dark:text-slate-300'
                                }`}
                        >
                            <NotebookPen className="h-4 w-4" />
                            Notes
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('transcript')}
                            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm ${activeTab === 'transcript' ? 'bg-cyan-500/15 text-cyan-900 dark:bg-slate-800 dark:text-cyan-200' : 'text-slate-700 dark:text-slate-300'
                                }`}
                        >
                            <ClipboardList className="h-4 w-4" />
                            Transcript
                        </button>
                    </div>

                    {activeTab === 'notes' ? (
                        <div className="flex h-full flex-col p-4">
                            <Textarea
                                className="h-full min-h-[260px]"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder="Jot down key points while interview runs..."
                            />
                        </div>
                    ) : (
                        <div className="h-full space-y-3 overflow-y-auto p-4">
                            {transcript.map((entry) => (
                                <div key={entry.id} className={`flex flex-col ${entry.role === 'candidate' ? 'items-end' : 'items-start'}`}>
                                    <p className="mb-1 text-xs text-slate-600 dark:text-slate-400">{entry.role === 'interviewer' ? config.persona : 'You'}</p>
                                    <div
                                        className={`max-w-[90%] rounded-md px-3 py-2 text-sm ${entry.role === 'candidate'
                                            ? 'bg-cyan-500/80 text-slate-950'
                                            : 'border border-slate-400/50 bg-white/95 text-slate-900 dark:border-slate-300/20 dark:bg-slate-900/60 dark:text-slate-100'
                                            }`}
                                    >
                                        {entry.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>
                    )}
                </Card>
            </aside>
        </div>
    );
}
