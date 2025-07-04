#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the build script name from command line args
const buildType = process.argv[2];
const validTypes = ['node', 'common', 'web', 'all'];

if (!buildType || !validTypes.includes(buildType)) {
    console.error('Usage: node build-launcher.js <node|common|web|all>');
    process.exit(1);
}

// Determine platform and script to run
const isWindows = process.platform === 'win32';
const scriptExtension = isWindows ? '.bat' : '';
const buildScript = `build_${buildType}${scriptExtension}`;
const scriptPath = path.join(__dirname, buildScript);

// Launch the build script
const child = spawn(scriptPath, [], {
    stdio: 'inherit',
    shell: isWindows
});

child.on('error', (err) => {
    console.error(`Failed to start build script: ${err.message}`);
    process.exit(1);
});

child.on('exit', (code) => {
    process.exit(code);
});