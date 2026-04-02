import Link from 'next/link';
import { BotMessageSquare, Mic, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const points = [
  {
    title: 'Real AI Interviewer',
    text: 'Your AI conducts actual interviews—asking follow-up questions, probing deeper, and adapting to your level. Pick your interviewer (CEO, CTO, HR, Manager) and get grilled.',
    icon: Mic,
  },
  {
    title: 'No Cheating Allowed',
    text: 'Tab away? We catch it. Copy-paste an answer? We know. This is a real interview to prepare for real interviews.',
    icon: ShieldCheck,
  },
  {
    title: 'Honest Scoring & Plan',
    text: 'You get a score, your strengths, weaknesses, and exactly what to work on next. No participation trophy real feedback for real improvement.',
    icon: Sparkles,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 md:px-8">
      <section className="rounded-3xl border border-slate-400/40 bg-white/85 p-8 backdrop-blur dark:border-slate-300/20 dark:bg-slate-900/60 md:p-12">
        <div className="flex max-w-3xl flex-col gap-5">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800 dark:border-cyan-300/30 dark:text-cyan-200">
            <BotMessageSquare className="h-3.5 w-3.5" />
            Practice Now, Crush Later
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
            Interview yourself before they interview you
          </h1>
          <p className="text-base text-slate-700 dark:text-slate-300 md:text-lg">
            Go through 5 questions with AI that adapts to you. Speak naturally, get scored, see what you nailed and what to fix. No prep-speak required.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/setup">Get Interviewed</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/interview">Practice Now</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {points.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-cyan-700 dark:text-cyan-200" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.text}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
