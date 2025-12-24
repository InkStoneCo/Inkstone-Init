#!/usr/bin/env node
// CLI entry point
// Phase 4.1 實作

import { program } from 'commander';
import {
  initCommand,
  daemonCommand,
  mapCommand,
  listCommand,
  showCommand,
  treeCommand,
  addCommand,
  editCommand,
  deleteCommand,
  linkCommand,
  unlinkCommand,
  searchCommand,
  refsCommand,
  orphansCommand,
  popularCommand,
  expandCommand,
  scanCommand,
  checkCommand,
  exportCommand,
  statsCommand,
} from './commands/index.js';

program
  .name('codemind')
  .description('AI-friendly Zettelkasten note system for code')
  .version('0.1.0');

// ============================================
// 初始化指令
// ============================================

program
  .command('init')
  .description('Initialize Code-Mind in current directory')
  .option('-n, --name <name>', 'Project name')
  .action(async (options: { name?: string }) => {
    await initCommand(options);
  });

// ============================================
// Daemon 管理
// ============================================

program
  .command('daemon <action>')
  .description('Manage daemon (start|stop|status)')
  .action(async (action: string) => {
    if (action !== 'start' && action !== 'stop' && action !== 'status') {
      console.error(`Unknown action: ${action}`);
      console.log('Valid actions: start, stop, status');
      process.exit(1);
    }
    await daemonCommand(action as 'start' | 'stop' | 'status');
  });

// ============================================
// 顯示指令
// ============================================

program
  .command('map')
  .description('Show project map')
  .action(async () => {
    await mapCommand();
  });

program
  .command('list')
  .description('List all notes')
  .option('-f, --file <file>', 'Filter by file')
  .option('-l, --limit <n>', 'Limit results', parseInt)
  .action(async (options: { file?: string; limit?: number }) => {
    await listCommand(options);
  });

program
  .command('show <id>')
  .description('Show note details')
  .action(async (id: string) => {
    await showCommand(id);
  });

program
  .command('tree')
  .description('Show notes in tree format')
  .option('-f, --file <file>', 'Filter by file')
  .action(async (options: { file?: string }) => {
    await treeCommand(options);
  });

// ============================================
// 筆記操作
// ============================================

program
  .command('add <file> <content>')
  .description('Add a new note')
  .option('-p, --parent <id>', 'Parent note ID')
  .action(async (file: string, content: string, options: { parent?: string }) => {
    await addCommand(file, content, options);
  });

program
  .command('edit <id> <content>')
  .description('Edit a note')
  .action(async (id: string, content: string) => {
    await editCommand(id, content);
  });

program
  .command('delete <id>')
  .description('Delete a note')
  .action(async (id: string) => {
    await deleteCommand(id);
  });

program
  .command('link <from> <to>')
  .description('Link two notes')
  .action(async (from: string, to: string) => {
    await linkCommand(from, to);
  });

program
  .command('unlink <from> <to>')
  .description('Unlink two notes')
  .action(async (from: string, to: string) => {
    await unlinkCommand(from, to);
  });

// ============================================
// 搜尋指令
// ============================================

program
  .command('search <query>')
  .description('Search notes')
  .option('-l, --limit <n>', 'Limit results', parseInt)
  .action(async (query: string, options: { limit?: number }) => {
    await searchCommand(query, options);
  });

program
  .command('refs <id>')
  .description('Show note references')
  .action(async (id: string) => {
    await refsCommand(id);
  });

program
  .command('orphans')
  .description('List orphan notes')
  .action(async () => {
    await orphansCommand();
  });

program
  .command('popular')
  .description('List most referenced notes')
  .option('-l, --limit <n>', 'Limit results', parseInt)
  .action(async (options: { limit?: number }) => {
    await popularCommand(options);
  });

// ============================================
// 工具指令
// ============================================

program
  .command('expand <file>')
  .description('Expand file with note content')
  .action(async (file: string) => {
    await expandCommand(file);
  });

program
  .command('scan')
  .description('Trigger manual scan for markers')
  .action(async () => {
    await scanCommand();
  });

program
  .command('check')
  .description('Verify data consistency')
  .action(async () => {
    await checkCommand();
  });

program
  .command('export')
  .description('Export notes')
  .option('--json', 'Export as JSON')
  .action(async (options: { json?: boolean }) => {
    await exportCommand(options);
  });

program
  .command('stats')
  .description('Show statistics')
  .action(async () => {
    await statsCommand();
  });

// Parse and execute
program.parse();
