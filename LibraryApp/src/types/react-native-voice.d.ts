declare module 'react-native-voice' {
  export interface SpeechResultsEvent {
    value?: string[];
  }

  export interface SpeechErrorEvent {
    error?: {
      code?: string;
      message?: string;
    };
  }

  export interface SpeechVolumeEvent {
    value?: number;
  }

  class Voice {
    static onSpeechStart: ((e: any) => void) | undefined;
    static onSpeechEnd: ((e: any) => void) | undefined;
    static onSpeechResults: ((e: SpeechResultsEvent) => void) | undefined;
    static onSpeechError: ((e: SpeechErrorEvent) => void) | undefined;
    static onSpeechVolumeChanged: ((e: SpeechVolumeEvent) => void) | undefined;
    static onSpeechPartialResults: ((e: SpeechResultsEvent) => void) | undefined;

    static start(locale: string): Promise<void>;
    static stop(): Promise<void>;
    static cancel(): Promise<void>;
    static destroy(): Promise<void>;
    static removeAllListeners(): Promise<void>;
    static isAvailable(): Promise<boolean>;
  }

  export default Voice;
}
