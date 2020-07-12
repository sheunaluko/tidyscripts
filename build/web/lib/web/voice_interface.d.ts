import * as sr from "./speech_recognition";
export declare var recognition: any;
export declare enum RecognitionState {
    NULL = "NULL",
    PAUSED = "PAUSED",
    LISTENING = "LISTENING"
}
export declare var recognition_state: RecognitionState;
export declare function initialize_recognition(ops?: sr.RecognitionOps): void;
export declare function pause_recognition(): void;
export declare function stop_recognition(): void;
export declare function start_recognition(): Promise<void>;
export declare function stop_recognition_and_detection(): number;
export declare function start_recognition_and_detection(t: number): void;
export declare function speak(text: string): Promise<void>;
