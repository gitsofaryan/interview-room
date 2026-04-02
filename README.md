# Interview Room

Interview Room is a Next.js interview simulator with:

- Setup -> Interview -> Report route flow
- Voice-first interview experience (Puter chat, speech-to-text, text-to-speech)
- Session persistence in browser storage
- Integrity monitoring (tab switch and paste counters)
- Dark and light theme support

## Table Of Contents

- Overview
- Architecture Diagram
- Sequence Diagram
- Route Flow
- Project Structure
- Tech Stack
- Local Setup
- Scripts
- Troubleshooting

## Overview

The app uses a route-based workflow:

1. Candidate config is created in `/setup`
2. Interview runs in `/interview`
3. Final report is shown in `/report`

Session state is stored in `sessionStorage` via `lib/interview-session.ts`, so each route can resume safely.

## Architecture Diagram

```mermaid
flowchart LR
      U["Candidate Browser"] --> H["App Header + Theme Toggle"]
      U --> RG["Route Guards"]

      subgraph NextApp["Next.js App Router"]
         L["app/layout.tsx\nThemeProvider + PuterAuthGate"]
         S["/setup\nSetupScreen"]
         I["/interview\nInterviewRoom"]
         R["/report\nReportScreen"]
      end

      subgraph LocalState["Client State"]
         SS["sessionStorage\ninterview-room-state-v2"]
         CFG["InterviewConfig"]
         TR["Transcript + Notes"]
         REP["ReportData"]
      end

      subgraph Puter["Puter SDK"]
         AUTH["auth.isSignedIn / signIn"]
         CHAT["ai.chat"]
         STT["ai.speech2txt"]
         TTS["ai.txt2speech"]
         FS["fs.write"]
      end

      L --> S
      S -->|save config| SS
      SS --> CFG
      CFG --> I

      I -->|candidate audio| STT
      I -->|question + evaluation| CHAT
      I -->|interviewer playback| TTS
      I -->|persist progress| SS
      I -->|final transcript + report| R

      R -->|retry| S
      R -->|download/save| FS
      L --> AUTH

      classDef client fill:#dbeafe,stroke:#2563eb,stroke-width:2,color:#0f172a;
      classDef routes fill:#dcfce7,stroke:#16a34a,stroke-width:2,color:#052e16;
      classDef state fill:#fef3c7,stroke:#d97706,stroke-width:2,color:#3f2a00;
      classDef sdk fill:#fce7f3,stroke:#db2777,stroke-width:2,color:#4a044e;

      class U,H,RG client;
      class L,S,I,R routes;
      class SS,CFG,TR,REP state;
      class AUTH,CHAT,STT,TTS,FS sdk;
```

## Sequence Diagram

```mermaid
%%{init: {'theme':'base','themeVariables': {
'primaryColor':'#dbeafe',
'primaryTextColor':'#0f172a',
'primaryBorderColor':'#2563eb',
'lineColor':'#0ea5e9',
'secondaryColor':'#dcfce7',
'tertiaryColor':'#fef3c7',
'background':'#ffffff',
'actorBkg':'#fce7f3',
'actorBorder':'#db2777',
'actorTextColor':'#111827',
'signalColor':'#0ea5e9',
'signalTextColor':'#0f172a'
}}%%
sequenceDiagram
      participant C as Candidate
      participant Setup as /setup
      participant Session as sessionStorage
      participant Room as /interview
      participant Puter as Puter SDK
      participant Report as /report

      C->>Setup: Fill candidate + role + rounds
      Setup->>Session: Save InterviewConfig
      Setup->>Room: Navigate to /interview

      Room->>Session: Load InterviewConfig
      Room->>Puter: ensurePuterSignedIn()
      Room->>Puter: ai.chat() for greeting
      Puter-->>Room: First question
      Room->>Puter: ai.txt2speech()

      loop Up to 5 questions
            C->>Room: Speak answer
            Room->>Puter: ai.speech2txt(audio)
            Puter-->>Room: Transcribed text
            Room->>Puter: ai.chat(follow-up prompt)
            Puter-->>Room: Next question
            Room->>Session: Save transcript + notes + counters
      end

      Room->>Puter: ai.chat(evaluation prompt)
      Puter-->>Room: JSON report
      Room->>Session: Save report
      Room->>Report: Navigate to /report

      Report->>Session: Load report
      C->>Report: View summary, retry, download
```

## Route Flow

- `/` landing page and entry navigation
- `/setup` collects interview configuration
- `/interview` runs live interview logic and integrity policy
- `/report` shows final score, strengths, weaknesses, and plan

Guards:

- `/interview` redirects to `/setup` if config is missing
- `/report` redirects to `/setup` if report is missing

## Project Structure

```text
app/
   layout.tsx
   page.tsx
   setup/page.tsx
   interview/page.tsx
   report/page.tsx
components/
   SetupScreen.tsx
   InterviewRoom.tsx
   ReportScreen.tsx
   app-header.tsx
   mode-toggle.tsx
   puter-auth-gate.tsx
   theme-provider.tsx
   ui/*
lib/
   puter.ts
   interview-session.ts
types/
   index.ts
   puter.d.ts
```

## Tech Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- next-themes
- motion
- Puter SDK (chat, speech, auth, file write)

## Local Setup

Prerequisites:

- Node.js 20+

Install and run:

```bash
npm install
npm run dev
```

Default local URL:

- `http://localhost:3001`

Optional local environment file:

- Create `.env.local` if your local setup needs extra runtime values.

## Scripts

- `npm run dev` start dev server on port 3001
- `npm run build` create production build
- `npm run start` start production server
- `npm run lint` run ESLint

## Troubleshooting

- Mic or camera not working:
   - Confirm browser permissions for camera and microphone.
   - Make sure no other app is locking the device.

- Interview route redirects back to setup:
   - Session config is missing or cleared.
   - Recreate interview from `/setup`.

- Report route redirects back to setup:
   - Report data was not generated yet.
   - Complete interview flow again.

- Port conflict:
   - Stop other processes on `3001`.
   - Restart with `npm run dev`.
