import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';


var log = console.log ;
var default_dir = "./data/spotdl"
/**
 * Synchronize a Spotify track or playlist using spotdl CLI.
 * If a .spotdl file exists for the given name, resumes sync from it;
 * otherwise, performs an initial sync from the URL and saves the .spotdl file.
 * Returns the path to the folder where files are stored.
 *
 * @param url   Spotify track or playlist URL
 * @param name  Base name for the .spotdl file and subdirectory
 * @param dir   Optional base directory to store data (defaults to default_dir)
 */
export async function spotdl_sync(
    url: string,
    name: string,
    dir: string = default_dir
): Promise<string> {
    log(`Starting spotdl sync for '${name}'`);
    // Determine and create target folder
    const baseDir = dir || default_dir;
    const folder = path.join(baseDir, name);
    try {
        fs.mkdirSync(folder, { recursive: true });
    } catch (err) {
        log(`Failed to create directory ${folder}:`, err);
        throw err;
    }
    // Prepare .spotdl file path
    const spotdlFile = `${name}.spotdl`;
    const spotdlPath = path.join(folder, spotdlFile);
    // Choose command based on existing .spotdl file
    let command: string;
    if (fs.existsSync(spotdlPath)) {
        log(`Found existing file ${spotdlFile}, resuming sync...`);
        command = `spotdl sync ${spotdlFile}`;
    } else {
        log(`No existing .spotdl file, performing initial sync from URL...`);
        command = `spotdl sync ${url} --save-file ${spotdlFile}`;
    }
    log(`Executing: ${command} (cwd=${folder})`);
    try {
        execSync(command, { cwd: folder, stdio: 'inherit' });
        log('spotdl sync completed successfully');
        return folder;
    } catch (err) {
        log('Error during spotdl sync:', err);
        throw err;
    }
}
	

