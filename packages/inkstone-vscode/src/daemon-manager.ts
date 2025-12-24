// DaemonManager - Manages Code-Mind daemon lifecycle in VSCode
// Sprint 3.4.1 實作

import * as vscode from 'vscode';

/**
 * Daemon 狀態
 */
export type DaemonState = 'stopped' | 'starting' | 'running' | 'error';

/**
 * Daemon 狀態資訊
 */
export interface DaemonStatusInfo {
  state: DaemonState;
  uptime?: number;
  processedFiles?: number;
  errors?: number;
  message?: string;
}

/**
 * DaemonManager 類別
 * 管理 Code-Mind daemon 的生命週期和狀態
 */
export class DaemonManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private state: DaemonState = 'stopped';
  private outputChannel: vscode.OutputChannel;
  private updateTimer: NodeJS.Timeout | null = null;
  private _onStateChange = new vscode.EventEmitter<DaemonState>();
  readonly onStateChange = this._onStateChange.event;

  // 模擬的統計數據（實際會從 daemon 取得）
  private processedFiles = 0;
  private errorCount = 0;
  private startTime: number | null = null;

  constructor() {
    // 建立狀態列項目
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'inkstone.daemon.showMenu';

    // 建立輸出頻道
    this.outputChannel = vscode.window.createOutputChannel('Code-Mind Daemon');

    // 初始化狀態
    this.updateStatusBar();
  }

  /**
   * 啟動 daemon
   */
  async start(): Promise<void> {
    if (this.state === 'running') {
      vscode.window.showInformationMessage('Code-Mind daemon is already running');
      return;
    }

    this.setState('starting');
    this.log('Starting Code-Mind daemon...');

    try {
      // TODO: 實際整合 @inkstone/codemind-daemon
      // 目前使用模擬實作
      await this.simulateStart();

      this.startTime = Date.now();
      this.setState('running');
      this.log('Code-Mind daemon started successfully');

      // 開始定期更新狀態
      this.startStatusUpdates();

      vscode.window.showInformationMessage('Code-Mind daemon started');
    } catch (error) {
      this.setState('error');
      this.log(`Failed to start daemon: ${error}`);
      vscode.window.showErrorMessage(`Failed to start Code-Mind daemon: ${error}`);
    }
  }

  /**
   * 停止 daemon
   */
  async stop(): Promise<void> {
    if (this.state === 'stopped') {
      vscode.window.showInformationMessage('Code-Mind daemon is not running');
      return;
    }

    this.log('Stopping Code-Mind daemon...');

    try {
      // TODO: 實際停止 daemon
      await this.simulateStop();

      this.stopStatusUpdates();
      this.startTime = null;
      this.setState('stopped');
      this.log('Code-Mind daemon stopped');

      vscode.window.showInformationMessage('Code-Mind daemon stopped');
    } catch (error) {
      this.log(`Error stopping daemon: ${error}`);
      vscode.window.showErrorMessage(`Error stopping Code-Mind daemon: ${error}`);
    }
  }

  /**
   * 重新啟動 daemon
   */
  async restart(): Promise<void> {
    this.log('Restarting Code-Mind daemon...');
    await this.stop();
    await this.start();
  }

  /**
   * 取得目前狀態
   */
  getStatus(): DaemonStatusInfo {
    const info: DaemonStatusInfo = {
      state: this.state,
      processedFiles: this.processedFiles,
      errors: this.errorCount,
    };

    if (this.startTime) {
      info.uptime = Date.now() - this.startTime;
    }

    return info;
  }

  /**
   * 顯示操作選單
   */
  async showMenu(): Promise<void> {
    const items: vscode.QuickPickItem[] = [];

    if (this.state === 'running') {
      items.push(
        { label: '$(debug-stop) Stop Daemon', description: 'Stop the Code-Mind daemon' },
        { label: '$(refresh) Restart Daemon', description: 'Restart the Code-Mind daemon' },
        { label: '$(search) Scan Workspace', description: 'Scan workspace for code notes' },
        { label: '$(info) Show Status', description: 'Show daemon status details' }
      );
    } else {
      items.push(
        { label: '$(play) Start Daemon', description: 'Start the Code-Mind daemon' },
        { label: '$(info) Show Status', description: 'Show daemon status details' }
      );
    }

    items.push(
      { label: '$(output) Show Logs', description: 'Show daemon output logs' }
    );

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Code-Mind Daemon Actions',
    });

    if (!selected) return;

    switch (selected.label) {
      case '$(play) Start Daemon':
        await this.start();
        break;
      case '$(debug-stop) Stop Daemon':
        await this.stop();
        break;
      case '$(refresh) Restart Daemon':
        await this.restart();
        break;
      case '$(search) Scan Workspace':
        await this.scanWorkspace();
        break;
      case '$(info) Show Status':
        this.showStatusDetails();
        break;
      case '$(output) Show Logs':
        this.outputChannel.show();
        break;
    }
  }

  /**
   * 掃描工作區
   */
  async scanWorkspace(): Promise<void> {
    this.log('Scanning workspace for code notes...');

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Scanning workspace...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Starting scan...' });

        // TODO: 實際掃描工作區
        await new Promise((resolve) => setTimeout(resolve, 1000));
        progress.report({ increment: 50, message: 'Processing files...' });

        await new Promise((resolve) => setTimeout(resolve, 1000));
        progress.report({ increment: 100, message: 'Done!' });

        this.log('Workspace scan completed');
        vscode.window.showInformationMessage('Workspace scan completed');
      }
    );
  }

  /**
   * 顯示狀態詳情
   */
  private showStatusDetails(): void {
    const status = this.getStatus();
    const uptimeStr = status.uptime
      ? this.formatUptime(status.uptime)
      : 'N/A';

    const message = [
      `State: ${status.state}`,
      `Uptime: ${uptimeStr}`,
      `Processed Files: ${status.processedFiles || 0}`,
      `Errors: ${status.errors || 0}`,
    ].join('\n');

    vscode.window.showInformationMessage(`Code-Mind Daemon Status\n\n${message}`);
  }

  /**
   * 更新狀態列
   */
  private updateStatusBar(): void {
    const icons: Record<DaemonState, string> = {
      stopped: '$(circle-outline)',
      starting: '$(loading~spin)',
      running: '$(circle-filled)',
      error: '$(error)',
    };

    const colors: Record<DaemonState, string | vscode.ThemeColor | undefined> = {
      stopped: undefined,
      starting: new vscode.ThemeColor('statusBarItem.warningForeground'),
      running: new vscode.ThemeColor('statusBarItem.prominentForeground'),
      error: new vscode.ThemeColor('statusBarItem.errorForeground'),
    };

    this.statusBarItem.text = `${icons[this.state]} Code-Mind`;
    this.statusBarItem.color = colors[this.state];

    const tooltipLines = ['Code-Mind Daemon'];
    tooltipLines.push(`Status: ${this.state}`);

    if (this.state === 'running' && this.startTime) {
      tooltipLines.push(`Uptime: ${this.formatUptime(Date.now() - this.startTime)}`);
      tooltipLines.push(`Processed: ${this.processedFiles} files`);
      if (this.errorCount > 0) {
        tooltipLines.push(`Errors: ${this.errorCount}`);
      }
    }

    tooltipLines.push('', 'Click for options');
    this.statusBarItem.tooltip = tooltipLines.join('\n');
    this.statusBarItem.show();
  }

  /**
   * 設定狀態
   */
  private setState(state: DaemonState): void {
    this.state = state;
    this.updateStatusBar();
    this._onStateChange.fire(state);
  }

  /**
   * 開始狀態更新
   */
  private startStatusUpdates(): void {
    this.updateTimer = setInterval(() => {
      // 模擬處理檔案
      if (Math.random() > 0.7) {
        this.processedFiles++;
      }
      this.updateStatusBar();
    }, 5000);
  }

  /**
   * 停止狀態更新
   */
  private stopStatusUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * 模擬啟動
   */
  private async simulateStart(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /**
   * 模擬停止
   */
  private async simulateStop(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  /**
   * 格式化運行時間
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * 記錄日誌
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * 釋放資源
   */
  dispose(): void {
    this.stopStatusUpdates();
    this.statusBarItem.dispose();
    this.outputChannel.dispose();
    this._onStateChange.dispose();
  }
}

/**
 * 全域 DaemonManager 實例
 */
let daemonManager: DaemonManager | null = null;

/**
 * 取得 DaemonManager 實例
 */
export function getDaemonManager(): DaemonManager {
  if (!daemonManager) {
    daemonManager = new DaemonManager();
  }
  return daemonManager;
}

/**
 * 註冊 Daemon 指令
 */
export function registerDaemonCommands(context: vscode.ExtensionContext): void {
  const manager = getDaemonManager();

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.daemon.start', () => manager.start()),
    vscode.commands.registerCommand('inkstone.daemon.stop', () => manager.stop()),
    vscode.commands.registerCommand('inkstone.daemon.restart', () => manager.restart()),
    vscode.commands.registerCommand('inkstone.daemon.showMenu', () => manager.showMenu()),
    vscode.commands.registerCommand('inkstone.daemon.scan', () => manager.scanWorkspace()),
    manager
  );
}
