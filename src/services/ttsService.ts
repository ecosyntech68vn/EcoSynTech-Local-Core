/**
 * TTS Service - Text-to-Speech using Google Translate
 * TypeScript version
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export interface TTSOptions {
  lang?: string;
  slow?: boolean;
}

export async function textToSpeech(text: string, lang = 'vi', slow = false): Promise<string | null> {
  try {
    const textEncoded = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${textEncoded}&tl=${lang}&client=tw-ob${slow ? '&spd=2' : ''}`;
    
    return new Promise((resolve, reject) => {
      const fileName = `alert_${Date.now()}.mp3`;
      const filePath = path.join(TEMP_DIR, fileName);
      
      const file = fs.createWriteStream(filePath);
      
      https.get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(filePath);
          });
        } else {
          file.close();
          fs.unlink(filePath, () => {});
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      }).on('error', (err: Error) => {
        file.close();
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  } catch (error: any) {
    console.error('[TTS] Error:', error);
    return null;
  }
}

export function getTempDir(): string {
  return TEMP_DIR;
}

export function cleanupOldFiles(maxAgeMs = 3600000): void {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`[TTS] Cleaned: ${file}`);
      }
    }
  } catch (error: any) {
    console.error('[TTS] Cleanup error:', error);
  }
}

export default {
  textToSpeech,
  getTempDir,
  cleanupOldFiles
};