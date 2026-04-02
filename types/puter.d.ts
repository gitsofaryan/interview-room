export {};

declare global {
  interface PuterChatMessageContentPart {
    text?: string;
  }

  interface PuterChatResponse {
    text?: string;
    message?: {
      content?: string | PuterChatMessageContentPart[];
    };
  }

  interface PuterStoredFile {
    path: string;
  }

  interface PuterAuth {
    isSignedIn(): Promise<boolean>;
    signIn(): Promise<void>;
  }

  interface PuterAi {
    chat(
      prompt: string,
      options?: { model?: string },
    ): Promise<PuterChatResponse | string>;
    speech2txt(audio: Blob): Promise<unknown>;
    txt2speech(text: string): Promise<HTMLAudioElement>;
  }

  interface PuterKv {
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string): Promise<T | null>;
  }

  interface PuterFs {
    write(path: string, data: string | Blob | File): Promise<PuterStoredFile>;
  }

  interface Puter {
    auth: PuterAuth;
    ai: PuterAi;
    kv: PuterKv;
    fs: PuterFs;
  }

  interface Window {
    puter?: Puter;
  }

  const puter: Puter;
}
