import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Configuration parameters at the top
const youtubeUrl: string = 'https://www.youtube.com/watch?v=R_DQnVk9gPU';
const preferredLanguage: string = 'en';  // Try English subtitles first
const yt_dlp_cmd = process.env.YT_DLP_LOC ;
const tidyscripts_data_dir = process.env.TIDYSCRIPTS_DATA_DIR ;
const tmpWorkingDirectory: string = path.join(tidyscripts_data_dir, 'tmp' )

const log = console.log ; 

export function get_transcript(url : string) {
    let passed = checks(url) ;
    if (!passed ) {  return }
    let transcript = extractAndCleanSubtitles(url) ;
    return transcript ; 
    
} 


export function checks(url : string) {
    if (! yt_dlp_cmd ) {
	log(`Need yt_dlp_loc env var`) ; return false
    } 

    if (! tidyscripts_data_dir ) {
	log(`Need tidyscripts data dir env var`) ; return false
    } 

    if (! url ) {
	log(`Need url`) ; false 
    }

    return true 

}

// Logging function
function log(message: string): void {
    console.log(`[DEBUG] ${message}`);
}

/**
 * Main function to extract and clean subtitles
 */
async function extractAndCleanSubtitles(youtubeUrl : string): Promise<void> {
    try {
        log('Starting subtitle extraction...');

        // Ensure temporary working directory exists
        if (!fs.existsSync(tmpWorkingDirectory)) {
            fs.mkdirSync(tmpWorkingDirectory, { recursive: true });
            log(`Created directory: ${tmpWorkingDirectory}`);
        }

        // Generate the output subtitle file path
        const subtitleFileBaseName = path.join(tmpWorkingDirectory, 'subtitles');	
        const subtitleFilePath = subtitleFileBaseName + ".en.srt" ;  //ytdlp adds this 
        const transcriptFilePath = path.join(tmpWorkingDirectory, 'transcript.txt');	

        // Run yt-dlp to download the subtitles (English first, fallback to auto-generated)
        const ytDlpCommand = `${yt_dlp_cmd} --write-subs --write-auto-subs --sub-lang ${preferredLanguage} --convert-subs srt --skip-download --output "${subtitleFileBaseName}" ${youtubeUrl}` 

	
        log(`Running yt-dlp with command: ${ytDlpCommand}`);
        execSync(ytDlpCommand, { stdio: 'inherit' });

        // Check if the subtitle file was created
        if (!fs.existsSync(subtitleFilePath)) {
            throw new Error('Subtitle file not found.');
        }
        log('Subtitle file successfully downloaded.');

        // Read and parse the .srt file
        const rawSubtitles = fs.readFileSync(subtitleFilePath, 'utf-8');
        log('Reading subtitle file completed.');
        
        const cleanTranscript = parseAndCleanSubtitles(rawSubtitles);
        
        // Output the clean transcript
        log('Clean transcript generation completed.');
	fs.writeFileSync(transcriptFilePath, cleanTranscript) 
        console.log('\n=== Clean Transcript Written ===\n');
	return cleanTranscript 
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

/**
 * Parse and clean the subtitles from an .srt file
 * @param subtitles Raw subtitles from the .srt file
 * @returns Cleaned transcript as a string
 */
function parseAndCleanSubtitles(subtitles: string): string {
    const lines = subtitles.split('\n');
    let transcript: string[] = [];
    let currentText: string = '';

    // Regex to detect timestamps (e.g., "00:00:01,280 --> 00:00:03,189")
    const timestampRegex = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/;

    for (const line of lines) {
        if (line.trim() === '' || /^\d+$/.test(line) || timestampRegex.test(line)) {
            // Skip empty lines, index lines, or timestamp lines
            continue;
        }

        // Clean line by removing extra spaces and special characters if needed
        const cleanedLine = line.trim().replace(/[^\w\s,.!?'-]/g, '');

        // Avoid adding duplicate lines or words
        if (currentText !== cleanedLine) {
            transcript.push(cleanedLine);
            currentText = cleanedLine;
        }
    }

    log('Subtitles parsed and cleaned successfully.');
    // Join cleaned lines into a single transcript
    return transcript.join(' ');
}

