export declare function start_power(): void;
declare type listener = [string, any];
export declare var listeners: listener[];
export declare var detection_threshold: number;
export declare function set_detection_threshold(t: number): void;
export declare function audio_detector(cb: any, thresh?: number): void;
export declare function stop(): void;
export {};
