/**
 * API route to download a Spotify playlist via spotdl (Python CLI)
 * Requires: spotdl (install via `pip install spotdl`)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const { playlistId } = req.body as { playlistId?: string };
  if (!playlistId) {
    return res.status(400).json({ message: 'Missing playlistId' });
  }
  const playlistUrl = `https://open.spotify.com/playlist/${playlistId}`;

  // Create temporary directory for downloads
  const tmpDir = path.join(os.tmpdir(), `spotifile_${playlistId}_${Date.now()}`);
  await fs.promises.mkdir(tmpDir, { recursive: true });
  try {
    // Download tracks using spotify-downloader CLI (needs to be installed)
    // Download tracks using spotdl CLI (Python-based spotify-downloader)
    // Ensure you have installed spotdl (pip install spotdl)
    await new Promise<void>((resolve, reject) => {
      // Use flags to skip over problematic downloads and conversion errors
      const args = [
        playlistUrl,
        '--output', tmpDir,
        '--ignore-file-errors',      // skip encoding/conversion errors
        '--ignore-download-errors',  // skip broken downloads (YT-DLP errors)
      ];
      const proc = spawn('spotdl', args, { stdio: 'inherit', shell: true });
      proc.on('close', code => {
        if (code === 0) {
          return resolve();
        }
        // Log non-zero exit but continue zipping whatever was downloaded
        console.warn(`spotdl exited with code ${code}, continuing`);
        resolve();
      });
      proc.on('error', err => {
        // CLI not found or failed to start
        reject(new Error(`Failed to start spotdl: ${err.message}`));
      });
    });
  } catch (err: any) {
    console.error('Error during download:', err);
    return res.status(500).json({ message: 'Download failed', error: err.message });
  }

  // Stream ZIP of downloaded files back to client
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${playlistId}.zip"`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', archiveErr => {
    console.error('Archive error:', archiveErr);
    res.status(500).end();
  });
  archive.pipe(res);
  archive.directory(tmpDir, false);
  archive.finalize();

  // Cleanup temp directory after response
  res.on('finish', () => {
    fs.rm(tmpDir, { recursive: true, force: true }, err => {
      if (err) console.error('Cleanup error:', err);
    });
  });
}