// Memory Module - Sprint 5 實作
// 提供記憶管理功能：儲存、恢復、搜尋

import * as vscode from 'vscode';
import { extensionStore } from '../store.js';
import type { Note, NoteId } from '@inkstone/codemind-core';

/**
 * 記憶檔案名稱常量
 */
const MEMORY_FILE = 'memory';

/**
 * 取得所有記憶類型的筆記
 */
export function getMemoryNotes(): Note[] {
  const allNotes = extensionStore.getAllNotes();
  return allNotes.filter(note => note.properties.type === 'memory');
}

/**
 * Quick Pick 項目介面
 */
interface MemoryQuickPickItem extends vscode.QuickPickItem {
  noteId: NoteId;
  note: Note;
}

/**
 * Save Memory 指令處理器
 * 顯示輸入對話框，讓用戶輸入標題和內容，建立 memory 類型筆記
 */
export async function saveMemoryHandler(): Promise<void> {
  // 檢查是否有 codemind.md
  if (!extensionStore.getStore()) {
    const initAnswer = await vscode.window.showWarningMessage(
      'Inkstone: 尚未初始化專案。需要先執行 Initialize Project 嗎？',
      '初始化',
      '取消'
    );
    if (initAnswer === '初始化') {
      vscode.commands.executeCommand('inkstone.initProject');
    }
    return;
  }

  // 取得標題
  const title = await vscode.window.showInputBox({
    prompt: '輸入記憶標題',
    placeHolder: '例如：架構決策、技術棧選擇、今日進度...',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return '標題不可為空';
      }
      return null;
    },
  });

  if (!title) {
    return;
  }

  // 取得內容
  const content = await vscode.window.showInputBox({
    prompt: '輸入記憶內容',
    placeHolder: '記錄重要資訊...',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return '內容不可為空';
      }
      return null;
    },
  });

  if (!content) {
    return;
  }

  // 可選：取得標籤
  const tagsInput = await vscode.window.showInputBox({
    prompt: '輸入標籤（可選，用逗號分隔）',
    placeHolder: '例如：architecture, decision, progress',
  });

  const tags = tagsInput
    ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)
    : undefined;

  // 建立記憶筆記
  try {
    const extraProps: { type: 'memory'; title: string; tags?: string[] } = {
      type: 'memory',
      title: title,
    };
    if (tags && tags.length > 0) {
      extraProps.tags = tags;
    }

    const note = extensionStore.addNote(
      MEMORY_FILE,
      `${title}\n${content}`,
      undefined,
      undefined,
      extraProps
    );

    if (note) {
      vscode.window.showInformationMessage(
        `記憶已儲存：${title} (${note.properties.id})`
      );
    } else {
      vscode.window.showErrorMessage('記憶儲存失敗');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`記憶儲存失敗：${error}`);
  }
}

/**
 * Restore Memory 指令處理器
 * 讀取所有 memory 類型筆記，格式化輸出並複製到剪貼簿
 */
export async function restoreMemoryHandler(): Promise<void> {
  // 檢查是否有 codemind.md
  if (!extensionStore.getStore()) {
    vscode.window.showWarningMessage(
      'Inkstone: 尚未初始化專案，沒有可恢復的記憶。'
    );
    return;
  }

  const memories = getMemoryNotes();

  if (memories.length === 0) {
    vscode.window.showInformationMessage('Inkstone: 目前沒有儲存的記憶。');
    return;
  }

  // 選擇恢復方式
  const restoreOption = await vscode.window.showQuickPick(
    [
      { label: '複製全部記憶到剪貼簿', description: `共 ${memories.length} 筆記憶`, value: 'all' },
      { label: '選擇特定記憶', description: '從列表中選擇', value: 'select' },
      { label: '插入到編輯器', description: '將記憶插入當前文件', value: 'insert' },
    ],
    { placeHolder: '選擇恢復方式' }
  );

  if (!restoreOption) {
    return;
  }

  if (restoreOption.value === 'all') {
    // 格式化所有記憶
    const formattedMemories = formatMemoriesForClipboard(memories);
    await vscode.env.clipboard.writeText(formattedMemories);
    vscode.window.showInformationMessage(
      `已將 ${memories.length} 筆記憶複製到剪貼簿`
    );
  } else if (restoreOption.value === 'select') {
    // 選擇特定記憶
    const items: MemoryQuickPickItem[] = memories.map(note => ({
      label: note.properties.title || note.displayPath,
      description: note.properties.tags?.join(', ') || '',
      detail: note.content.map(l => l.content).join(' ').substring(0, 100),
      noteId: note.properties.id,
      note: note,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '選擇要恢復的記憶',
      canPickMany: true,
    });

    if (selected && selected.length > 0) {
      const selectedNotes = selected.map(s => s.note);
      const formattedMemories = formatMemoriesForClipboard(selectedNotes);
      await vscode.env.clipboard.writeText(formattedMemories);
      vscode.window.showInformationMessage(
        `已將 ${selected.length} 筆記憶複製到剪貼簿`
      );
    }
  } else if (restoreOption.value === 'insert') {
    // 插入到編輯器
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('請先開啟一個文件');
      return;
    }

    const items: MemoryQuickPickItem[] = memories.map(note => ({
      label: note.properties.title || note.displayPath,
      description: note.properties.tags?.join(', ') || '',
      detail: note.content.map(l => l.content).join(' ').substring(0, 100),
      noteId: note.properties.id,
      note: note,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '選擇要插入的記憶',
      canPickMany: true,
    });

    if (selected && selected.length > 0) {
      const selectedNotes = selected.map(s => s.note);
      const formattedMemories = formatMemoriesForInsert(selectedNotes);

      await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, formattedMemories);
      });

      vscode.window.showInformationMessage(
        `已插入 ${selected.length} 筆記憶`
      );
    }
  }
}

/**
 * Search Memory 指令處理器
 * 實作搜尋對話框，即時顯示符合結果
 */
export async function searchMemoryHandler(): Promise<void> {
  // 檢查是否有 codemind.md
  if (!extensionStore.getStore()) {
    vscode.window.showWarningMessage(
      'Inkstone: 尚未初始化專案，沒有可搜尋的記憶。'
    );
    return;
  }

  const memories = getMemoryNotes();

  if (memories.length === 0) {
    vscode.window.showInformationMessage('Inkstone: 目前沒有儲存的記憶。');
    return;
  }

  // 建立 Quick Pick 並實作即時過濾
  const quickPick = vscode.window.createQuickPick<MemoryQuickPickItem>();
  quickPick.placeholder = '輸入關鍵字搜尋記憶...';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  // 初始顯示所有記憶
  const allItems: MemoryQuickPickItem[] = memories.map(note => ({
    label: `$(note) ${note.properties.title || note.displayPath}`,
    description: note.properties.tags?.join(', ') || '',
    detail: note.content.map(l => l.content).join(' ').substring(0, 150),
    noteId: note.properties.id,
    note: note,
  }));

  quickPick.items = allItems;

  // 監聽搜尋輸入變化
  quickPick.onDidChangeValue(value => {
    if (!value) {
      quickPick.items = allItems;
      return;
    }

    const query = value.toLowerCase();
    const filtered = allItems.filter(item => {
      const titleMatch = item.label.toLowerCase().includes(query);
      const descMatch = item.description?.toLowerCase().includes(query) || false;
      const detailMatch = item.detail?.toLowerCase().includes(query) || false;
      const contentMatch = item.note.content.some(l =>
        l.content.toLowerCase().includes(query)
      );
      return titleMatch || descMatch || detailMatch || contentMatch;
    });

    quickPick.items = filtered;
  });

  // 監聯選擇事件
  quickPick.onDidAccept(async () => {
    const selected = quickPick.selectedItems[0];
    if (selected) {
      quickPick.hide();

      // 顯示選中記憶的操作選單
      const action = await vscode.window.showQuickPick(
        [
          { label: '$(clippy) 複製到剪貼簿', value: 'copy' },
          { label: '$(edit) 插入到編輯器', value: 'insert' },
          { label: '$(go-to-file) 跳轉到定義', value: 'goto' },
          { label: '$(trash) 刪除此記憶', value: 'delete' },
        ],
        { placeHolder: `記憶：${selected.note.properties.title || selected.noteId}` }
      );

      if (!action) return;

      switch (action.value) {
        case 'copy':
          const formatted = formatMemoriesForClipboard([selected.note]);
          await vscode.env.clipboard.writeText(formatted);
          vscode.window.showInformationMessage('記憶已複製到剪貼簿');
          break;

        case 'insert':
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            const insertText = formatMemoriesForInsert([selected.note]);
            await editor.edit(editBuilder => {
              editBuilder.insert(editor.selection.active, insertText);
            });
            vscode.window.showInformationMessage('記憶已插入');
          } else {
            vscode.window.showWarningMessage('請先開啟一個文件');
          }
          break;

        case 'goto':
          vscode.commands.executeCommand('inkstone.goToNote', selected.noteId);
          break;

        case 'delete':
          const confirm = await vscode.window.showWarningMessage(
            `確定要刪除記憶「${selected.note.properties.title || selected.noteId}」嗎？`,
            { modal: true },
            '刪除'
          );
          if (confirm === '刪除') {
            extensionStore.deleteNote(selected.noteId);
            vscode.window.showInformationMessage('記憶已刪除');
          }
          break;
      }
    }
  });

  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}

/**
 * 格式化記憶內容供剪貼簿使用
 */
function formatMemoriesForClipboard(notes: Note[]): string {
  const lines: string[] = [
    '# Inkstone 記憶恢復',
    `> 恢復時間：${new Date().toLocaleString('zh-TW')}`,
    `> 共 ${notes.length} 筆記憶`,
    '',
  ];

  for (const note of notes) {
    lines.push(`## ${note.properties.title || note.displayPath}`);
    lines.push(`- ID: ${note.properties.id}`);
    lines.push(`- 建立時間: ${note.properties.created}`);

    if (note.properties.tags && note.properties.tags.length > 0) {
      lines.push(`- 標籤: ${note.properties.tags.join(', ')}`);
    }

    lines.push('');

    // 內容（跳過第一行如果是標題）
    const contentLines = note.content.map(l => l.content);
    const startIndex = contentLines[0] === note.properties.title ? 1 : 0;
    for (let i = startIndex; i < contentLines.length; i++) {
      lines.push(contentLines[i] || '');
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 格式化記憶內容供編輯器插入使用
 */
function formatMemoriesForInsert(notes: Note[]): string {
  const lines: string[] = [];

  for (const note of notes) {
    lines.push(`<!-- Memory: ${note.properties.id} -->`);
    lines.push(`### ${note.properties.title || note.displayPath}`);

    // 內容（跳過第一行如果是標題）
    const contentLines = note.content.map(l => l.content);
    const startIndex = contentLines[0] === note.properties.title ? 1 : 0;
    for (let i = startIndex; i < contentLines.length; i++) {
      lines.push(contentLines[i] || '');
    }

    lines.push('');
  }

  return lines.join('\n');
}
