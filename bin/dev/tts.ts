import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import OpenAI from 'openai';

const { FileSystemCache } = node.apis.node_cache;
const { CacheUtils } = common.apis.cache ;
const log = common.logger.get_logger({id: 'tts'});

interface TTSOptions {
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    model?: 'tts-1' | 'tts-1-hd';
    num_texts?: number;
    silence_duration?: number;
    data_file?: string;
    output_file?: string;
}

interface TextData {
    data: string[];
}

const cacheDir = path.join(process.env['TIDYSCRIPTS_DATA_DIR'] as string, '.cache/tts' ) ;    

const cache = new FileSystemCache<any>({
    cacheDir , 
    onlyLogHitsMisses : true,
    logPrefix: '[TTS Cache]',
    namespace: 'audio'
});

const openai_client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export function load_text_data(file_path: string): string[] {
    const data: TextData = JSON.parse(fs.readFileSync(file_path, 'utf8'));
    
    // Filter out empty strings, null, and undefined values
    const filtered_data = data.data.filter(text => {
        return text && typeof text === 'string' && text.trim().length > 0;
    });
    
    const removed_count = data.data.length - filtered_data.length;
    if (removed_count > 0) {
        log(`Filtered out ${removed_count} empty/null text entries`);
    }
    
    return filtered_data;
}

export function select_random_texts(texts: string[], n: number): string[] {
    if (n > texts.length) {
        throw new Error(`Cannot select ${n} texts from ${texts.length} available texts`);
    }
    const shuffled = [...texts].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

async function _generate_tts_audio_base(text: string, voice: string = 'alloy', model: string = 'tts-1'): Promise<Buffer> {
    // Check for empty or null text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        log('Skipping TTS generation for empty/null text');
        return Buffer.alloc(0); // Return empty buffer
    }

    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable must be set');
    }

    const response = await openai_client.audio.speech.create({
        model: model as 'tts-1' | 'tts-1-hd',
        voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text
    });

    return Buffer.from(await response.arrayBuffer());
}

export const cached_generate_tts_audio = CacheUtils.memoize(_generate_tts_audio_base, cache);

export async function generate_tts_audio(text: string, voice: string = 'alloy', model: string = 'tts-1'): Promise<Buffer> {
    return cached_generate_tts_audio(text, voice, model);
}

export function create_silence(duration_seconds: number): Buffer {
    const sample_rate = 44100;
    const channels = 2;
    const bytes_per_sample = 2;
    const samples = Math.floor(sample_rate * duration_seconds);
    const buffer_size = samples * channels * bytes_per_sample;
    
    return Buffer.alloc(buffer_size, 0);
}

export async function generate_tts_from_texts(options: TTSOptions = {}): Promise<Buffer[]> {
    const {
        voice = 'alloy',
        model = 'tts-1',
        num_texts = 5,
        data_file = 'data/text_data.json'
    } = options;

    log(`Loading texts from ${data_file}...`);
    const texts = load_text_data(data_file);
    log(`Loaded ${texts.length} texts`);

    log(`Selecting ${num_texts} random texts...`);
    const selected_texts = select_random_texts(texts, num_texts);

    const audio_buffers: Buffer[] = [];

    for (const [i, text] of selected_texts.entries()) {
        log(`Generating TTS for text ${i + 1}/${selected_texts.length}...`);
        log(`Text preview: ${text.substring(0, 100)}...`);

        const audio_buffer = await generate_tts_audio(text, voice, model);
        
        // Only add non-empty buffers
        if (audio_buffer.length > 0) {
            audio_buffers.push(audio_buffer);
        }
    }

    return audio_buffers;
}

interface AudioConfig {
    sample_rate?: number;
    channels?: number;
    channel_layout?: string;
    format?: string;
}

class AudioProcessor {
    private static default_config: AudioConfig = {
        sample_rate: 44100,
        channels: 2,
        channel_layout: 'stereo',
        format: 'mp3'
    };

    static validate_ffmpeg_available(): void {
        try {
            execSync('ffmpeg -version', { stdio: 'ignore' });
        } catch (error) {
            throw new Error('ffmpeg is not installed or not available in PATH');
        }
    }

    static create_silence_file(duration: number, output_path: string, config: AudioConfig = {}): void {
        const cfg = { ...AudioProcessor.default_config, ...config };
        const command = `ffmpeg -f lavfi -i anullsrc=channel_layout=${cfg.channel_layout}:sample_rate=${cfg.sample_rate} -t ${duration} -c:a ${cfg.format} "${output_path}" -y`;
        
        log(`Creating ${duration}s silence file...`);
        execSync(command, { stdio: 'pipe' });
    }

    static build_concat_command(audio_files: string[], silence_file: string, output_file: string): string {
        const filter_parts: string[] = [];
        const inputs: string[] = [];
        
        for (let i = 0; i < audio_files.length; i++) {
            inputs.push('-i', `"${audio_files[i]}"`);
            filter_parts.push(`[${i}:a]`);
            
            if (i < audio_files.length - 1) {
                inputs.push('-i', `"${silence_file}"`);
                filter_parts.push(`[${audio_files.length + i}:a]`);
            }
        }

        const filter_complex = `${filter_parts.join('')}concat=n=${filter_parts.length}:v=0:a=1[out]`;
        return `ffmpeg ${inputs.join(' ')} -filter_complex "${filter_complex}" -map "[out]" "${output_file}" -y`;
    }

    static execute_concat(audio_files: string[], silence_file: string, output_file: string): void {
        const command = AudioProcessor.build_concat_command(audio_files, silence_file, output_file);
        log('Running ffmpeg concatenation...');
        execSync(command, { stdio: 'inherit' });
    }
}

class TempFileManager {
    private tmp_dir: string;
    private audio_files: string[] = [];
    private silence_file?: string;

    constructor(prefix: string = 'tts-') {
        this.tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    }

    get_temp_dir(): string {
        return this.tmp_dir;
    }

    get_silence_path(): string {
        return path.join(this.tmp_dir, 'silence.mp3');
    }

    save_buffers_to_temp(buffers: Buffer[]): string[] {
        this.audio_files = [];
        
        for (const [i, buffer] of buffers.entries()) {
            const filename = `audio_${i.toString().padStart(3, '0')}.mp3`;
            const filepath = path.join(this.tmp_dir, filename);
            fs.writeFileSync(filepath, buffer);
            this.audio_files.push(filepath);
            log(`Created temp file: ${filename}`);
        }
        
        return this.audio_files;
    }

    mark_silence_file(path: string): void {
        this.silence_file = path;
    }

    cleanup(): void {
        log('Cleaning up temporary files...');
        
        // Remove audio files
        for (const file of this.audio_files) {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        }
        
        // Remove silence file
        if (this.silence_file && fs.existsSync(this.silence_file)) {
            fs.unlinkSync(this.silence_file);
        }
        
        // Remove temp directory
        try {
            fs.rmdirSync(this.tmp_dir);
        } catch (error) {
            log(`Could not remove temp directory ${this.tmp_dir}: ${error}`);
        }
    }
}

export async function save_audio_buffers(audio_buffers: Buffer[], output_file: string, silence_duration: number = 2.0): Promise<void> {
    log('Concatenating audio files with silence using ffmpeg...');

    // Validate prerequisites
    AudioProcessor.validate_ffmpeg_available();
    
    if (audio_buffers.length === 0) {
        throw new Error('No audio buffers provided');
    }

    const temp_manager = new TempFileManager('tts-');
    
    try {
        // Save audio buffers to temporary files
        const audio_files = temp_manager.save_buffers_to_temp(audio_buffers);
        
        // Create silence file
        const silence_file = temp_manager.get_silence_path();
        AudioProcessor.create_silence_file(silence_duration, silence_file);
        temp_manager.mark_silence_file(silence_file);
        
        // Ensure output directory exists
        const output_dir = path.dirname(output_file);
        if (!fs.existsSync(output_dir)) {
            fs.mkdirSync(output_dir, { recursive: true });
        }
        
        // Execute concatenation
        AudioProcessor.execute_concat(audio_files, silence_file, output_file);
        
        log(`Audio concatenation completed: ${output_file}`);
        
    } catch (error) {
        log(`Error during audio processing: ${error}`);
        throw error;
    } finally {
        temp_manager.cleanup();
    }
}

export async function generate_and_save_tts_audio(options: TTSOptions = {}): Promise<void> {
    const {
        voice = 'alloy',
        model = 'tts-1',
        num_texts = 5,
        silence_duration = 2.0,
        data_file = 'data/text_data.json',
        output_file = 'output_audio.mp3'
    } = options;

    try {
        const audio_buffers = await generate_tts_from_texts({
            voice,
            model,
            num_texts,
            data_file
        });

        await save_audio_buffers(audio_buffers, output_file, silence_duration);

        const total_files = audio_buffers.length;
        log('Audio generation completed successfully!');
        log(`Generated ${total_files} audio files`);
        log(`Output directory: ${path.dirname(output_file)}`);

    } catch (error) {
        log(`Error generating TTS audio: ${error}`);
        throw error;
    }
}

export async function create_audio_sections(num_parts: number, data_file: string = 'data/text_data.json'): Promise<void> {
    log(`Creating ${num_parts} audio sections from ${data_file}`);
    
    // Load all text data
    const all_texts = load_text_data(data_file);
    const total_texts = all_texts.length;
    
    if (total_texts === 0) {
        throw new Error('No valid texts found in data file');
    }
    
    // Calculate texts per section
    const texts_per_section = Math.floor(total_texts / num_parts);
    const remainder = total_texts % num_parts;
    
    log(`Total texts: ${total_texts}`);
    log(`Texts per section: ${texts_per_section} (with ${remainder} extra texts distributed)`);
    
    let current_index = 0;
    
    for (let part = 1; part <= num_parts; part++) {
        // Calculate how many texts for this part (distribute remainder across first parts)
        const texts_for_this_part = texts_per_section + (part <= remainder ? 1 : 0);
        
        // Get texts for this section
        const section_texts = all_texts.slice(current_index, current_index + texts_for_this_part);
        current_index += texts_for_this_part;
        
        log(`Creating part ${part}/${num_parts} with ${section_texts.length} texts`);
        
        // Generate audio for this section
        const audio_buffers: Buffer[] = [];
        
        for (const [i, text] of section_texts.entries()) {
            log(`Part ${part} - Processing text ${i + 1}/${section_texts.length}`);
            
            const audio_buffer = await generate_tts_audio(text);
            
            // Only add non-empty buffers
            if (audio_buffer.length > 0) {
                audio_buffers.push(audio_buffer);
            }
        }
        
        // Save this section
        const output_file = `output_part_${part}.mp3`;
        await save_audio_buffers(audio_buffers, output_file, 2.0);
        
        log(`Completed part ${part}: ${output_file}`);
    }
    
    log(`All ${num_parts} audio sections created successfully!`);
}

export async function default_process(file: string, num: number): Promise<void> {
    await generate_and_save_tts_audio({
        data_file: file,
        num_texts: num,
        voice: 'alloy',
        model: 'tts-1',
        silence_duration: 2.0,
        output_file: 'output_audio.mp3'
    });
}

export default {
    generate_tts_audio,
    generate_tts_from_texts,
    generate_and_save_tts_audio,
    load_text_data,
    select_random_texts,
    create_silence,
    save_audio_buffers,
    create_audio_sections,
    default_process
};
