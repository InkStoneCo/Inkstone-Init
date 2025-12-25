// SPARC Module - Sprint 6 實作
// 提供 SPARC 開發模式的指令封裝和執行

import * as vscode from 'vscode';

/**
 * SPARC 模式定義
 */
export interface SparcMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
  placeholder: string;
}

/**
 * 所有可用的 SPARC 模式
 */
export const SPARC_MODES: SparcMode[] = [
  // 核心模式
  {
    id: 'architect',
    name: 'Architect',
    description: '系統架構設計 - 規劃整體架構、定義組件關係',
    icon: 'symbol-structure',
    prompt: '輸入架構設計任務',
    placeholder: '設計系統架構、API 設計、資料庫結構...',
  },
  {
    id: 'coder',
    name: 'Coder',
    description: '程式碼實作 - 根據規格撰寫程式碼',
    icon: 'code',
    prompt: '輸入編碼任務',
    placeholder: '實作功能、修復 Bug、重構程式碼...',
  },
  {
    id: 'tdd',
    name: 'TDD',
    description: '測試驅動開發 - 先寫測試再實作',
    icon: 'beaker',
    prompt: '輸入 TDD 任務',
    placeholder: '撰寫單元測試、整合測試...',
  },
  // 擴展模式
  {
    id: 'reviewer',
    name: 'Reviewer',
    description: '程式碼審查 - 檢視程式碼品質和最佳實踐',
    icon: 'eye',
    prompt: '輸入審查任務',
    placeholder: '審查 PR、檢查安全漏洞...',
  },
  {
    id: 'debugger',
    name: 'Debugger',
    description: '除錯專家 - 分析和修復程式錯誤',
    icon: 'bug',
    prompt: '輸入除錯任務',
    placeholder: '分析錯誤訊息、追蹤問題根源...',
  },
  {
    id: 'optimizer',
    name: 'Optimizer',
    description: '效能優化 - 分析和改善系統效能',
    icon: 'dashboard',
    prompt: '輸入優化任務',
    placeholder: '效能分析、記憶體優化、查詢優化...',
  },
  {
    id: 'documenter',
    name: 'Documenter',
    description: '文件撰寫 - 產生技術文件和註釋',
    icon: 'book',
    prompt: '輸入文件任務',
    placeholder: '撰寫 API 文件、README、程式碼註釋...',
  },
  {
    id: 'security',
    name: 'Security',
    description: '安全審計 - 檢查安全漏洞和最佳實踐',
    icon: 'shield',
    prompt: '輸入安全任務',
    placeholder: '安全稽核、漏洞掃描、權限檢查...',
  },
  {
    id: 'refactor',
    name: 'Refactor',
    description: '程式碼重構 - 改善程式碼結構不改變行為',
    icon: 'wrench',
    prompt: '輸入重構任務',
    placeholder: '重構模組、提取函數、改善命名...',
  },
  {
    id: 'api',
    name: 'API Designer',
    description: 'API 設計 - 設計 RESTful 或 GraphQL API',
    icon: 'cloud',
    prompt: '輸入 API 設計任務',
    placeholder: '設計端點、定義資料格式...',
  },
];

/**
 * 取得核心模式（前三個）
 */
export function getCoreModes(): SparcMode[] {
  return SPARC_MODES.slice(0, 3);
}

/**
 * 取得擴展模式
 */
export function getExtendedModes(): SparcMode[] {
  return SPARC_MODES.slice(3);
}

/**
 * 執行狀態
 */
interface ExecutionState {
  mode: string;
  task: string;
  terminal: vscode.Terminal;
  startTime: Date;
}

// 追蹤執行中的任務
const activeExecutions: Map<string, ExecutionState> = new Map();

/**
 * 執行 SPARC 模式
 */
export async function executeSparcMode(mode: SparcMode): Promise<void> {
  // 取得任務描述
  const task = await vscode.window.showInputBox({
    prompt: mode.prompt,
    placeHolder: mode.placeholder,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return '請輸入任務描述';
      }
      if (value.length < 5) {
        return '任務描述至少需要 5 個字元';
      }
      return null;
    },
  });

  if (!task) {
    return;
  }

  // 檢查是否有相同模式正在執行
  if (activeExecutions.has(mode.id)) {
    const confirm = await vscode.window.showWarningMessage(
      `${mode.name} 模式正在執行中，是否開啟新的執行？`,
      '開啟新執行',
      '取消'
    );
    if (confirm !== '開啟新執行') {
      return;
    }
  }

  // 建立終端
  const terminalName = `SPARC ${mode.name}`;
  const terminal = vscode.window.createTerminal({
    name: terminalName,
    iconPath: new vscode.ThemeIcon(mode.icon),
  });

  // 記錄執行狀態
  const executionId = `${mode.id}-${Date.now()}`;
  activeExecutions.set(executionId, {
    mode: mode.id,
    task,
    terminal,
    startTime: new Date(),
  });

  // 顯示開始通知
  vscode.window.showInformationMessage(
    `$(${mode.icon}) SPARC ${mode.name}: 開始執行...`
  );

  // 執行指令
  const escapedTask = task.replace(/"/g, '\\"');
  terminal.sendText(`claude-flow sparc run ${mode.id} "${escapedTask}"`);
  terminal.show();

  // 監聽終端關閉事件
  const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
    if (closedTerminal === terminal) {
      activeExecutions.delete(executionId);
      disposable.dispose();
    }
  });
}

/**
 * 顯示所有 SPARC 模式選單
 */
export async function showSparcModeMenu(): Promise<void> {
  interface ModeQuickPickItem extends vscode.QuickPickItem {
    mode: SparcMode;
  }

  const items: ModeQuickPickItem[] = SPARC_MODES.map((mode) => ({
    label: `$(${mode.icon}) ${mode.name}`,
    description: mode.description,
    mode,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: '選擇 SPARC 開發模式',
    matchOnDescription: true,
  });

  if (selected) {
    await executeSparcMode(selected.mode);
  }
}

/**
 * 取得模式說明 (供 Hover 使用)
 */
export function getModeDescription(modeId: string): string | undefined {
  const mode = SPARC_MODES.find((m) => m.id === modeId);
  if (!mode) return undefined;

  return `### $(${mode.icon}) ${mode.name}\n\n${mode.description}\n\n*點擊執行此模式*`;
}

/**
 * 註冊所有 SPARC 指令
 */
export function registerSparcCommands(context: vscode.ExtensionContext): void {
  // 核心模式快捷指令
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.sparc.architect', () => {
      const mode = SPARC_MODES.find((m) => m.id === 'architect');
      if (mode) executeSparcMode(mode);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.sparc.coder', () => {
      const mode = SPARC_MODES.find((m) => m.id === 'coder');
      if (mode) executeSparcMode(mode);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.sparc.tdd', () => {
      const mode = SPARC_MODES.find((m) => m.id === 'tdd');
      if (mode) executeSparcMode(mode);
    })
  );

  // 更多模式選單
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.sparc.more', showSparcModeMenu)
  );

  // 通用執行指令 (供 TreeView 使用)
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.sparc.execute', (modeId: string) => {
      const mode = SPARC_MODES.find((m) => m.id === modeId);
      if (mode) {
        executeSparcMode(mode);
      } else {
        vscode.window.showErrorMessage(`未知的 SPARC 模式: ${modeId}`);
      }
    })
  );
}
