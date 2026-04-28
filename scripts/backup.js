#!/usr/bin/env node
/**
 * EcoSynTech Backup CLI
 * Usage: npm run backup
 */

require('dotenv').config();
const { createBackup, listBackups, BACKUP_DIR } = require('../src/services/backupRestoreService');
const fs = require('fs');

async function main() {
  console.log('=== EcoSynTech Backup ===\n');
  
  try {
    console.log('Creating backup...');
    const result = await createBackup({ compression: true });
    
    console.log('✓ Backup created successfully!');
    console.log(`  Path: ${result.backupPath}`);
    console.log(`  Size: ${result.size} bytes`);
    console.log(`  Tables: ${result.tablesCount}`);
    
    console.log('\n=== Recent Backups ===');
    const backups = await listBackups();
    backups.slice(0, 5).forEach((b, i) => {
      console.log(`${i + 1}. ${b.name} - ${b.size} - ${b.date}`);
    });
    
  } catch (err) {
    console.error('✗ Backup failed:', err.message);
    process.exit(1);
  }
}

main();