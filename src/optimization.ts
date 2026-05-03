import * as os from 'os';

interface SystemInfo {
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  usagePercent: number;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
}

interface MemoryStatus {
  heapUsed: string;
  heapTotal: string;
  rss: string;
  external: string;
}

const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const memUsagePercent = (usedMem / totalMem) * 100;

let __aiManager: unknown = null;
let __aiInit = false;

function ensureAI(): unknown {
  if (!__aiInit) {
    try {
      const AIManager = require('./services/AIManager');
      if (AIManager && AIManager.AIManager) {
        __aiManager = new AIManager.AIManager();
      }
    } catch (e) {
      __aiManager = null;
    }
    __aiInit = true;
  }
  return __aiManager;
}

function getSystemInfo(): SystemInfo {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = (usedMem / totalMem) * 100;
  
  return {
    totalMemory: totalMem,
    freeMemory: freeMem,
    usedMemory: usedMem,
    usagePercent: memUsagePercent,
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: process.uptime()
  };
}

function getMemoryStatus(): MemoryStatus {
  const mem = process.memoryUsage();
  return {
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
    rss: (mem.rss / 1024 / 1024).toFixed(2) + ' MB',
    external: (mem.external / 1024 / 1024).toFixed(2) + ' MB'
  };
}

function getOptimizationHints(): string[] {
  const hints: string[] = [];
  const mem = process.memoryUsage();
  
  if (mem.heapUsed > 500 * 1024 * 1024) {
    hints.push('High heap usage detected. Consider optimizing data structures.');
  }
  
  if (memUsagePercent > 80) {
    hints.push('System memory is running low. Consider scaling horizontally.');
  }
  
  return hints;
}

export = {
  ensureAI,
  getSystemInfo,
  getMemoryStatus,
  getOptimizationHints
};