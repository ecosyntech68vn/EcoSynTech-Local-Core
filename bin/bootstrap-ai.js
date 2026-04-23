#!/usr/bin/env node
"use strict";
const { execSync } = require('child_process');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    small: true,
    large: false,
    onnxUrl: ''
  };
  for (const a of args) {
    if (a === '--no-small') parsed.small = false;
    else if (a === '--small') parsed.small = true;
    else if (a === '--no-large') parsed.large = false;
    else if (a === '--large') parsed.large = true;
    else if (a.startsWith('--onnx-url=')) parsed.onnxUrl = a.split('=')[1];
  }
  return parsed;
}

function run() {
  const p = parseArgs();
  process.env.AI_SMALL_MODEL = p.small ? '1' : '0';
  process.env.AI_LARGE_MODEL = p.large ? '1' : '0';
  if (p.onnxUrl) process.env.AI_ONNX_URL = p.onnxUrl;
  console.log('[Bootstrap-AI] Running bootstrap with:', {
    AI_SMALL_MODEL: process.env.AI_SMALL_MODEL,
    AI_LARGE_MODEL: process.env.AI_LARGE_MODEL,
    AI_ONNX_URL: process.env.AI_ONNX_URL || null
  });
  try {
    execSync('bash scripts/setup-models.sh', { stdio: 'inherit' });
  } catch (err) {
    console.error('[Bootstrap-AI] Bootstrap script failed:', err?.message || err);
    process.exit(1);
  }
}

run();
