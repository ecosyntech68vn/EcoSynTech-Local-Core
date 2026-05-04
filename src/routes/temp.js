const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const TEMP_DIR = path.join(__dirname, '../../temp');

router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(TEMP_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(filePath);
});

router.delete('/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(TEMP_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ success: true });
  }
  
  res.status(404).json({ error: 'File not found' });
});

router.get('/', (req, res) => {
  if (!fs.existsSync(TEMP_DIR)) {
    return res.json([]);
  }
  
  const files = fs.readdirSync(TEMP_DIR).map(f => ({
    name: f,
    size: fs.statSync(path.join(TEMP_DIR, f)).size,
    created: fs.statSync(path.join(TEMP_DIR, f)).mtime
  }));
  
  res.json(files);
});

module.exports = router;