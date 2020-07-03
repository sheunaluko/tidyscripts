export interface RecognitionOps {
    continuous?: boolean;
    interimResults?: boolean;
    onStart?: () => void;
    onSoundStart?: () => void;
    onResult?: () => void;
    onError?: () => void;
    onEnd?: () => void;
    lang?: string;
}
export declare function get_recognition_object(ops?: RecognitionOps): any;
