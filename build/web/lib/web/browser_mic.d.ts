interface AudioPrimitives {
    context: any;
    source: any;
    processor: any;
    stream: any;
}
export declare var audio_primitives: AudioPrimitives;
export declare function connect(f: any, event_name?: string): void;
export declare function disconnect(): void;
export {};
