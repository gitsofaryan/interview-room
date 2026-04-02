import type {Metadata} from 'next';
import './globals.css'; // Global styles
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'AI Interview Pro',
  description: 'AI-powered Google Meet interviewer',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      <body className="bg-[#0B0F14] text-white min-h-screen antialiased selection:bg-blue-500/30" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
