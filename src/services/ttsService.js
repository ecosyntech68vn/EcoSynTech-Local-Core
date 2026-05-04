const https = require('https');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function textToSpeech(text, lang = 'vi', slow = false) {
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
      }).on('error', (err) => {
        file.close();
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  } catch (error) {
    console.error('[TTS] Error:', error);
    return null;
  }
}

function getTempDir() {
  return TEMP_DIR;
}

function cleanupOldFiles(maxAgeMs = 3600000) {
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
  } catch (error) {
    console.error('[TTS] Cleanup error:', error);
  }
}

module.exports = {
  textToSpeech,
  getTempDir,
  cleanupOldFiles
};