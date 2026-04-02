import type { Metadata } from 'next';
import './globals.css'; // Global styles
import Script from 'next/script';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { PuterAuthGate } from '@/components/puter-auth-gate';
import { AppHeader } from '@/components/app-header';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Interview Pro',
  description: 'AI-powered interview simulator using Puter',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      <body className="app-bg min-h-screen antialiased selection:bg-cyan-400/30" suppressHydrationWarning>
        <ThemeProvider>
          <PuterAuthGate>
            <AppHeader />
            {children}
          </PuterAuthGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
