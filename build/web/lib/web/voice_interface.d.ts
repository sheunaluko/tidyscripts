import * as sr from "./speech_recognition";
export declare function initialize_recognition(ops?: sr.RecognitionOps): void;
export declare function stop_recognition(): void;
export declare function start_recognition(): Promise<void>;
export declare function speak(text: string): Promise<void>;
