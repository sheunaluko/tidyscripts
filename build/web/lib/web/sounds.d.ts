import { m2f } from "./midi2freq";
export { m2f };
export declare var context: any;
interface tone_ops {
    type?: string;
    freq: number;
    duration?: number;
}
export declare function tone(ops: tone_ops): Promise<void>;
interface note {
    num: number;
    mod: string | null;
    octave: number;
}
export declare function note_obj_to_midi(n: note): number;
export declare function note_to_note_obj(n: string): note;
export declare function note_to_midi(n: string): number;
export declare function note_to_freq(n: string): number;
export declare function play_note(n: string, dur?: number, key?: string): Promise<void>;
export declare function play_notes(notes: string[], dur?: number, key?: string): Promise<void>;
export declare function play_notes_delay(notes: string[], delay: number, dur?: number, key?: string): Promise<void>;
export declare function success(): void;
export declare function error(): void;
export declare function input_ready(): void;
export declare function proceed(): void;
