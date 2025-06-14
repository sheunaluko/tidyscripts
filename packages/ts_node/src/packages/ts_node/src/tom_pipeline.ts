import { promises as fs } from 'fs';
import * as path from 'path';
import { ingest_text } from './tom';

/**
 * Ingest all text files in the given directory by calling `ingest_text` on each.
 * @param directoryPath Path to the folder containing text files.
 * @param extension File extension to filter by (default: '.txt').
 */
export async function ingestDirectory(
  directoryPath: string,
  extension = '.txt',
): Promise<void> {
  const entries = await fs.readdir(directoryPath);
  for (const file of entries) {
    if (!file.endsWith(extension)) continue;
    const fullPath = path.join(directoryPath, file);
    const content = await fs.readFile(fullPath, 'utf-8');
    await ingest_text(content);
  }
}