#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get current directory name
const currentDir = path.basename(process.cwd());

// Determine platform and script to run
const isWindows = process.platform === 'win32';
const scriptExtension = isWindows ? '.bat' : '';
const tsnodeScript = `tsnode${scriptExtension}`;
const replScript = path.join(__dirname, 'repl.ts');

// Determine the correct tsnode path based on current directory
let tsnodePath;
if (currentDir === 'tidyscripts') {
    tsnodePath = path.join(__dirname, tsnodeScript);
} else {
    tsnodePath = `./${tsnodeScript}`;
}

// Check if tsnode exists
if (!existsSync(tsnodePath.replace(/\.bat$/, ''))) {
    console.error(`Error: ${tsnodePath} not found`);
    process.exit(1);
}

// Launch the REPL
const child = spawn(tsnodePath, [replScript], {
    stdio: 'inherit',
    shell: isWindows
});

child.on('error', (err) => {
    console.error('Failed to start REPL:', err.message);
    process.exit(1);
});

child.on('exit', (code) => {
    process.exit(code);
});