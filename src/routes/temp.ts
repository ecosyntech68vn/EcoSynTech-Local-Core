import express, { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router: Router = express.Router();

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export interface TempFile {
  name: string;
  size: number;
  created: Date;
}

router.get('/:filename', (req: Request, res: Response): void => {
  const filename = req.params.filename;
  const filePath = path.join(TEMP_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(filePath);
});

router.delete('/:filename', (req: Request, res: Response): void => {
  const filename = req.params.filename;
  const filePath = path.join(TEMP_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ success: true });
  }
  
  res.status(404).json({ error: 'File not found' });
});

router.get('/', (req: Request, res: Response): void => {
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

export default router;