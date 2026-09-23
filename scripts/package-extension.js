import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'apps', 'extension', 'dist');
const storeEdgeDir = path.join(rootDir, 'store-assets', 'edge');
const storeChromeDir = path.join(rootDir, 'store-assets', 'chrome');

fs.mkdirSync(storeEdgeDir, { recursive: true });
fs.mkdirSync(storeChromeDir, { recursive: true });

console.log('📦 Starting FocusFlow Extension Packaging...');

// 1. Verify dist folder exists
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'manifest.json'))) {
  console.log('Building extension first...');
  execSync('npm run build:extension', { stdio: 'inherit' });
}

// 2. Read version from manifest
const manifest = JSON.parse(fs.readFileSync(path.join(distDir, 'manifest.json'), 'utf-8'));
const version = manifest.version || '1.0.0';
console.log(`Detected FocusFlow version: v${version}`);

// 3. Compress using PowerShell Compress-Archive
const edgeZip = path.join(storeEdgeDir, `focusflow-edge-v${version}.zip`);
const chromeZip = path.join(storeChromeDir, `focusflow-chrome-v${version}.zip`);

console.log('Compressing files for Microsoft Edge Add-ons...');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${distDir}/*' -DestinationPath '${edgeZip}' -Force"`, { stdio: 'inherit' });

console.log('Compressing files for Chrome Web Store...');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${distDir}/*' -DestinationPath '${chromeZip}' -Force"`, { stdio: 'inherit' });

// 4. Calculate SHA-256 Checksums
function getChecksum(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

const edgeHash = getChecksum(edgeZip);
const chromeHash = getChecksum(chromeZip);

console.log('\n================ PACKAGE SUMMARY ================');
console.log(`✅ Edge Package:   ${edgeZip}`);
console.log(`   Size:           ${(fs.statSync(edgeZip).size / 1024).toFixed(2)} KB`);
console.log(`   SHA256:         ${edgeHash}`);
console.log(`✅ Chrome Package: ${chromeZip}`);
console.log(`   Size:           ${(fs.statSync(chromeZip).size / 1024).toFixed(2)} KB`);
console.log(`   SHA256:         ${chromeHash}`);
console.log('=================================================\n');

// Write checksums to file
fs.writeFileSync(path.join(storeEdgeDir, 'checksum.txt'), `SHA256 (focusflow-edge-v${version}.zip) = ${edgeHash}\n`);
fs.writeFileSync(path.join(storeChromeDir, 'checksum.txt'), `SHA256 (focusflow-chrome-v${version}.zip) = ${chromeHash}\n`);
