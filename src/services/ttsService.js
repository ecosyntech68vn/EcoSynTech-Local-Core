const tts = require('./ttsService');

module.exports = {
  textToSpeech: tts.textToSpeech,
  getTempDir: tts.getTempDir,
  cleanupOldFiles: tts.cleanupOldFiles
};