import * as common from "../common/util/index";
export { common };
import * as tts from "./tts";
import * as speech_recognition from "./speech_recognition";
import * as sounds from "./sounds";
import * as audio_processing from "./audio_processing";
import * as voice_interface from "./voice_interface";
export { tts, speech_recognition, sounds, voice_interface, audio_processing };
export declare function alert(s: string): void;