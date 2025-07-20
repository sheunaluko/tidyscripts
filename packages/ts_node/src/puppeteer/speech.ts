/**
 * Speech synthesis recording functionality using Web Speech API and Puppeteer 
 * 
 * This module provides text-to-speech conversion with audio recording capabilities
 * using the browser's native speechSynthesis API combined with Web Audio API
 * for capturing the generated audio.
 *
 * Note: this is ALMOST functional -- need to modify this to run via connecting via websocket and then debug its
 * @packageDocumentation
 */

import puppeteer from 'puppeteer';
import * as common from 'tidyscripts_common';
import * as fs from 'fs';

const log = common.logger.get_logger({id: "speech"});


// Note: this is ALMOST functional -- need to modify this to run via connecting via websocket and then debug its

export interface SpeechOptions {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    outputPath?: string;
}

export interface SpeechRecordingResult {
    audioBuffer: Buffer;
    success: boolean;
    error?: string;
}

/**
 * Creates a browser instance configured for audio recording
 * with necessary launch arguments for headless speech synthesis
 */
export async function get_speech_browser() {
    log("Starting puppeteer for speech synthesis...");
    
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-ui-for-media-stream',
            '--disable-web-security',
            '--allow-running-insecure-content'
        ]
    });

    log("Created speech-enabled browser");
    return browser;
}

/**
 * Records speech synthesis output and returns the audio as a Buffer
 * 
 * @param text The text to convert to speech
 * @param options Configuration options for speech synthesis
 * @returns Promise resolving to recording result with audio buffer
 */
export async function record_speech_synthesis(
    text: string, 
    options: SpeechOptions = {}
): Promise<SpeechRecordingResult> {
    
    const browser = await get_speech_browser();
    
    try {
        const page = await browser.newPage();
        
        log(`Recording speech synthesis for text: "${text.substring(0, 50)}..."`);
        
        const audioData = await page.evaluate((text, opts) => {
            return new Promise((resolve, reject) => {
                try {
                    // Create audio context and recorder setup
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const chunks: Blob[] = [];
                    
                    // Create a media stream destination
                    const dest = audioContext.createMediaStreamDestination();
                    const mediaRecorder = new MediaRecorder(dest.stream);
                    
                    // Set up recording event handlers
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            chunks.push(event.data);
                        }
                    };
                    
                    mediaRecorder.onstop = () => {
                        try {
                            const blob = new Blob(chunks, { type: 'audio/webm' });
                            blob.arrayBuffer().then(arrayBuffer => {
                                const uint8Array = new Uint8Array(arrayBuffer);
                                resolve(Array.from(uint8Array));
                            }).catch(error => {
                                reject(error);
                            });
                        } catch (error) {
                            reject(error);
                        }
                    };
                    
                    // Create speech synthesis
                    const utterance = new SpeechSynthesisUtterance(text);
                    
                    // Configure voice if specified
                    const voices = speechSynthesis.getVoices();
                    if (opts.voice && voices.length > 0) {
                        const selectedVoice = voices.find(v => v.name.includes(opts.voice!)) || voices[0];
                        utterance.voice = selectedVoice;
                    } else if (voices.length > 0) {
                        utterance.voice = voices[0];
                    }
                    
                    // Apply voice settings
                    utterance.rate = opts.rate || 1.0;
                    utterance.pitch = opts.pitch || 1.0;
                    utterance.volume = opts.volume || 1.0;
                    
                    // Start recording when speech begins
                    utterance.onstart = () => {
                        console.log('Speech synthesis started, beginning recording...');
                        mediaRecorder.start();
                    };
                    
                    // Stop recording when speech ends
                    utterance.onend = () => {
                        console.log('Speech synthesis ended, stopping recording...');
                        setTimeout(() => {
                            mediaRecorder.stop();
                        }, 100); // Small delay to ensure all audio is captured
                    };
                    
                    utterance.onerror = (event) => {
                        reject(new Error(`Speech synthesis error: ${event.error}`));
                    };
                    
                    // Start speech synthesis
                    speechSynthesis.speak(utterance);
                    
                } catch (error) {
                    reject(error);
                }
            });
        }, text, options);
        
        await browser.close();
        
        // Convert back to Buffer
        const buffer = Buffer.from(audioData as number[]);
        
        // Save to file if output path is specified
        if (options.outputPath) {
            fs.writeFileSync(options.outputPath, buffer);
            log(`Audio saved to: ${options.outputPath}`);
        }
        
        log(`Speech synthesis recording completed. Audio size: ${buffer.length} bytes`);
        
        return {
            audioBuffer: buffer,
            success: true
        };
        
    } catch (error) {
        await browser.close();
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error during speech synthesis: ${errorMessage}`);
        
        return {
            audioBuffer: Buffer.alloc(0),
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Convenience function to record speech and save directly to file
 * 
 * @param text The text to convert to speech
 * @param outputPath Path where to save the audio file
 * @param options Additional speech synthesis options
 * @returns Promise resolving to success status
 */
export async function text_to_speech_file(
    text: string,
    outputPath: string,
    options: Omit<SpeechOptions, 'outputPath'> = {}
): Promise<boolean> {
    
    const result = await record_speech_synthesis(text, {
        ...options,
        outputPath
    });
    
    return result.success;
}

/**
 * Gets available voices from the browser's speech synthesis API
 * Useful for determining what voice options are available
 */
export async function get_available_voices(): Promise<string[]> {
    const browser = await get_speech_browser();
    
    try {
        const page = await browser.newPage();
        
        const voices = await page.evaluate(() => {
            return new Promise<string[]>((resolve) => {
                const voiceList = speechSynthesis.getVoices();
                if (voiceList.length > 0) {
                    resolve(voiceList.map(voice => `${voice.name} (${voice.lang})`));
                } else {
                    // Wait for voices to load
                    speechSynthesis.onvoiceschanged = () => {
                        const voices = speechSynthesis.getVoices();
                        resolve(voices.map(voice => `${voice.name} (${voice.lang})`));
                    };
                }
            });
        });
        
        await browser.close();
        return voices;
        
    } catch (error) {
        await browser.close();
        log(`Error getting voices: ${error}`);
        return [];
    }
}
