'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, UploadCloud } from 'lucide-react';
import { ensurePuterSignedIn } from '@/lib/puter';
import { InterviewConfig, InterviewDifficulty, InterviewPersona } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const PERSONAS: { value: InterviewPersona; subtitle: string }[] = [
    { value: 'CEO', subtitle: 'Business and strategic perspective' },
    { value: 'CTO', subtitle: 'Architecture and technical depth' },
    { value: 'HR', subtitle: 'Communication and culture fit' },
    { value: 'Engineering Manager', subtitle: 'Execution and team impact' },
];

const ROUNDS = ['Technical', 'Behavioral', 'HR'] as const;
const DIFFICULTIES: InterviewDifficulty[] = ['Easy', 'Medium', 'Hard', 'Practice'];

export default function SetupScreen({ onStart }: { onStart: (config: InterviewConfig) => void }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [jd, setJd] = useState('');
    const [persona, setPersona] = useState<InterviewPersona>('CTO');
    const [rounds, setRounds] = useState<string[]>(['Technical']);
    const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Medium');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canStart = useMemo(() => Boolean(name.trim() && role.trim() && rounds.length > 0), [name, role, rounds.length]);

    const toggleRound = (round: string) => {
        setRounds((prev) => (prev.includes(round) ? prev.filter((r) => r !== round) : [...prev, round]));
    };

    const handleStart = async () => {
        if (!canStart) {
            alert('Please enter candidate name, role, and at least one round.');
            return;
        }

        setIsSubmitting(true);
        try {
            const puterClient = await ensurePuterSignedIn();
            let resumePath = '';

            if (resumeFile) {
                try {
                    const stored = await puterClient.fs.write(`resume_${Date.now()}_${resumeFile.name}`, resumeFile);
                    resumePath = stored.path;
                } catch (error) {
                    console.error('Resume upload failed', error);
                    alert('Resume upload failed. Continuing without resume.');
                }
            }

            onStart({
                name: name.trim(),
                role: role.trim(),
                jd: jd.trim(),
                persona,
                rounds,
                difficulty,
                resumePath,
            });
        } catch (error) {
            console.error('Puter sign-in failed', error);
            alert('Unable to continue without Puter login. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 pb-28 md:px-8">
            <section className="space-y-4">
                <Badge>Setup Workspace</Badge>
                <div className="space-y-2">
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Configure interview flow</h1>
                    <p className="max-w-3xl text-slate-700 dark:text-slate-300">
                        Fill profile, rounds, and difficulty. After this, the app routes to a dedicated interview room screen.
                    </p>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Candidate Info</CardTitle>
                        <CardDescription>Name, target role, and optional resume upload.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="candidate-name">Candidate Name</Label>
                            <Input id="candidate-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Aryan Kumar" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="target-role">Target Role</Label>
                            <Input id="target-role" value={role} onChange={(event) => setRole(event.target.value)} placeholder="SDE II" />
                        </div>

                        <div className="space-y-2">
                            <Label>Resume Upload</Label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-cyan-400/35 bg-cyan-500/8 px-4 py-6 text-center text-sm text-slate-700 transition hover:border-cyan-500/60 hover:bg-cyan-500/12 dark:border-cyan-300/30 dark:text-slate-300 dark:hover:border-cyan-300/60 dark:hover:bg-cyan-500/10"
                            >
                                <UploadCloud className="mb-2 h-5 w-5 text-cyan-700 dark:text-cyan-200" />
                                {resumeFile ? resumeFile.name : 'Click to upload (pdf/doc/docx/txt)'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.txt"
                                className="hidden"
                                onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Interview Blueprint</CardTitle>
                        <CardDescription>Job context, interviewer personality, rounds, and difficulty.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="jd">Job Description</Label>
                            <Textarea
                                id="jd"
                                value={jd}
                                onChange={(event) => setJd(event.target.value)}
                                className="min-h-[170px]"
                                placeholder="Paste job description and expectations for better question quality."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Interviewer Character</Label>
                            <div className="grid gap-2 md:grid-cols-2">
                                {PERSONAS.map((item) => {
                                    const selected = persona === item.value;
                                    return (
                                        <button
                                            type="button"
                                            key={item.value}
                                            onClick={() => setPersona(item.value)}
                                            className={`rounded-lg border px-3 py-3 text-left transition ${selected ? 'border-cyan-400/60 bg-cyan-500/18' : 'border-slate-400/45 bg-white/90 hover:border-slate-500/60 dark:border-slate-300/20 dark:bg-slate-950/50 dark:hover:border-slate-300/40'
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
                                            <p className="text-xs text-slate-700 dark:text-slate-400">{item.subtitle}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Interview Rounds</Label>
                                <div className="space-y-2">
                                    {ROUNDS.map((round) => {
                                        const selected = rounds.includes(round);
                                        return (
                                            <button
                                                type="button"
                                                key={round}
                                                onClick={() => toggleRound(round)}
                                                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${selected ? 'border-cyan-400/60 bg-cyan-500/18 text-cyan-900 dark:text-cyan-100' : 'border-slate-400/45 bg-white/90 text-slate-800 dark:border-slate-300/20 dark:bg-slate-950/50 dark:text-slate-200'
                                                    }`}
                                            >
                                                <span className={`inline-flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-cyan-400 bg-cyan-300 text-slate-900' : 'border-slate-500/45 dark:border-slate-400/40'}`}>
                                                    {selected ? <Check className="h-3 w-3" /> : null}
                                                </span>
                                                {round}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Difficulty</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {DIFFICULTIES.map((item) => {
                                        const selected = difficulty === item;
                                        return (
                                            <Button
                                                key={item}
                                                type="button"
                                                variant={selected ? 'default' : 'outline'}
                                                onClick={() => setDifficulty(item)}
                                            >
                                                {item}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-slate-100/95 to-transparent px-6 py-5 dark:from-slate-950">
                <Button size="lg" disabled={!canStart || isSubmitting} onClick={handleStart}>
                    {isSubmitting ? 'Preparing...' : 'Start Interview'}
                    {!isSubmitting ? <ChevronRight className="h-4 w-4" /> : null}
                </Button>
            </div>
        </div>
    );
}
