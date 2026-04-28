#!/usr/bin/env node
/**
 * EcoSynTech Restore CLI
 * Usage: npm run restore -- [backup-file]
 * Example: npm run restore -- backups/ecosyntech_2026-04-28.db
 */

require('dotenv').config();
const { restoreBackup, listBackups } = require('../src/services/backupRestoreService');
const path = require('path');

const args = process.argv.slice(2);
let backupPath = args[0];

async function main() {
  console.log('=== EcoSynTech Restore ===\n');
  
  if (!backupPath) {
    console.log('Available backups:\n');
    const backups = await listBackups();
    if (backups.length === 0) {
      console.log('No backups found.');
      return;
    }
    backups.forEach((b, i) => {
      console.log(`${i + 1}. ${b.name} - ${b.size} - ${b.date}`);
    });
    console.log('\nUsage: npm run restore -- backups/ecosyntech_YYYY-MM-DD.db');
    return;
  }
  
  try {
    console.log(`Restoring from: ${backupPath}`);
    const result = await restoreBackup(backupPath);
    
    console.log('✓ Restore completed successfully!');
    console.log(`  Restored tables: ${result.tablesCount}`);
    console.log(`  Records: ${result.recordsCount}`);
    
  } catch (err) {
    console.error('✗ Restore failed:', err.message);
    process.exit(1);
  }
}

main();