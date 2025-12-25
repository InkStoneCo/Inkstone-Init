// Webview Manager Module - Sprint 12 實作
// 提供優化的 Webview 管理功能

import * as vscode from 'vscode';

/**
 * Webview 訊息類型
 */
export interface WebviewMessage {
  type: string;
  payload?: unknown;
}

/**
 * Webview 狀態
 */
export interface WebviewState {
  isVisible: boolean;
  isPinned: boolean;
  lastUpdated?: Date;
}

/**
 * Webview 選項
 */
export interface WebviewOptions {
  viewType: string;
  title: string;
  enableScripts?: boolean;
  retainContextWhenHidden?: boolean;
  localResourceRoots?: vscode.Uri[];
}

/**
 * Webview 面板管理器 - 單例模式優化
 * 避免重複創建相同類型的 Webview
 */
export class WebviewManager {
  private panels: Map<string, vscode.WebviewPanel> = new Map();
  private states: Map<string, WebviewState> = new Map();
  private messageHandlers: Map<string, ((message: WebviewMessage) => void)[]> = new Map();
  private context: vscode.ExtensionContext | null = null;

  /**
   * 初始化管理器
   */
  initialize(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  /**
   * 取得或創建 Webview 面板
   * 如果面板已存在，則重用而不是創建新的
   */
  getOrCreatePanel(options: WebviewOptions, column?: vscode.ViewColumn): vscode.WebviewPanel {
    const existing = this.panels.get(options.viewType);

    if (existing) {
      // 重用現有面板
      existing.reveal(column || vscode.ViewColumn.One);
      this.updateState(options.viewType, { isVisible: true });
      return existing;
    }

    // 創建新面板
    const panel = vscode.window.createWebviewPanel(
      options.viewType,
      options.title,
      column || vscode.ViewColumn.One,
      {
        enableScripts: options.enableScripts ?? true,
        retainContextWhenHidden: options.retainContextWhenHidden ?? true,
        localResourceRoots: options.localResourceRoots,
      }
    );

    // 註冊面板
    this.panels.set(options.viewType, panel);
    this.states.set(options.viewType, {
      isVisible: true,
      isPinned: false,
      lastUpdated: new Date(),
    });

    // 監聽狀態變化
    panel.onDidChangeViewState(e => {
      this.updateState(options.viewType, { isVisible: e.webviewPanel.visible });
    });

    // 監聽面板關閉
    panel.onDidDispose(() => {
      this.panels.delete(options.viewType);
      this.states.delete(options.viewType);
      this.messageHandlers.delete(options.viewType);
    });

    // 設定訊息處理
    panel.webview.onDidReceiveMessage(message => {
      this.handleMessage(options.viewType, message);
    });

    return panel;
  }

  /**
   * 更新面板內容
   */
  updateContent(viewType: string, html: string): boolean {
    const panel = this.panels.get(viewType);
    if (!panel) return false;

    panel.webview.html = html;
    this.updateState(viewType, { lastUpdated: new Date() });
    return true;
  }

  /**
   * 發送訊息到 Webview
   */
  postMessage(viewType: string, message: WebviewMessage): boolean {
    const panel = this.panels.get(viewType);
    if (!panel) return false;

    panel.webview.postMessage(message);
    return true;
  }

  /**
   * 註冊訊息處理器
   */
  onMessage(viewType: string, handler: (message: WebviewMessage) => void): vscode.Disposable {
    if (!this.messageHandlers.has(viewType)) {
      this.messageHandlers.set(viewType, []);
    }
    this.messageHandlers.get(viewType)!.push(handler);

    return {
      dispose: () => {
        const handlers = this.messageHandlers.get(viewType);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * 處理訊息
   */
  private handleMessage(viewType: string, message: WebviewMessage): void {
    const handlers = this.messageHandlers.get(viewType);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  /**
   * 更新狀態
   */
  private updateState(viewType: string, updates: Partial<WebviewState>): void {
    const state = this.states.get(viewType);
    if (state) {
      this.states.set(viewType, { ...state, ...updates });
    }
  }

  /**
   * 取得面板狀態
   */
  getState(viewType: string): WebviewState | undefined {
    return this.states.get(viewType);
  }

  /**
   * 檢查面板是否存在
   */
  hasPanel(viewType: string): boolean {
    return this.panels.has(viewType);
  }

  /**
   * 關閉面板
   */
  closePanel(viewType: string): boolean {
    const panel = this.panels.get(viewType);
    if (!panel) return false;

    panel.dispose();
    return true;
  }

  /**
   * 關閉所有面板
   */
  closeAll(): void {
    for (const panel of this.panels.values()) {
      panel.dispose();
    }
    this.panels.clear();
    this.states.clear();
    this.messageHandlers.clear();
  }

  /**
   * 取得資源 URI
   */
  getWebviewUri(panel: vscode.WebviewPanel, ...pathSegments: string[]): vscode.Uri | null {
    if (!this.context) return null;

    const onDiskPath = vscode.Uri.joinPath(this.context.extensionUri, ...pathSegments);
    return panel.webview.asWebviewUri(onDiskPath);
  }
}

/**
 * HTML 模板生成器
 */
export class HtmlTemplateBuilder {
  private styles: string[] = [];
  private scripts: string[] = [];
  private bodyContent: string = '';
  private nonce: string;

  constructor() {
    this.nonce = this.generateNonce();
  }

  /**
   * 產生 nonce
   */
  private generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 添加樣式
   */
  addStyle(css: string): this {
    this.styles.push(css);
    return this;
  }

  /**
   * 添加樣式 URI
   */
  addStyleUri(uri: vscode.Uri): this {
    this.styles.push(`<link rel="stylesheet" href="${uri}">`);
    return this;
  }

  /**
   * 添加腳本
   */
  addScript(js: string): this {
    this.scripts.push(`<script nonce="${this.nonce}">${js}</script>`);
    return this;
  }

  /**
   * 添加腳本 URI
   */
  addScriptUri(uri: vscode.Uri): this {
    this.scripts.push(`<script nonce="${this.nonce}" src="${uri}"></script>`);
    return this;
  }

  /**
   * 設定 body 內容
   */
  setBody(html: string): this {
    this.bodyContent = html;
    return this;
  }

  /**
   * 建構 HTML
   */
  build(cspSource?: string): string {
    const csp = cspSource
      ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${this.nonce}'; img-src ${cspSource} https:; font-src ${cspSource};">`
      : '';

    const styleBlock = this.styles
      .map(s => (s.startsWith('<') ? s : `<style>${s}</style>`))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${csp}
  ${styleBlock}
</head>
<body>
  ${this.bodyContent}
  ${this.scripts.join('\n')}
</body>
</html>`;
  }
}

/**
 * 預設樣式
 */
export const DEFAULT_WEBVIEW_STYLES = `
:root {
  --vscode-font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  --vscode-font-size: var(--vscode-font-size, 13px);
}

body {
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  padding: 16px;
  margin: 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.card {
  background: var(--vscode-editor-widget-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}

.button {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  padding: 8px 16px;
  border-radius: 2px;
  cursor: pointer;
}

.button:hover {
  background: var(--vscode-button-hoverBackground);
}

.input {
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  padding: 6px 8px;
  border-radius: 2px;
  width: 100%;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--vscode-widget-border);
  cursor: pointer;
}

.list-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.list-item:last-child {
  border-bottom: none;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
}

.loading::after {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid var(--vscode-progressBar-background);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

/**
 * Webview 通訊橋接
 */
export function createWebviewBridge(): string {
  return `
const vscode = acquireVsCodeApi();

// 發送訊息到擴充功能
function postMessage(type, payload) {
  vscode.postMessage({ type, payload });
}

// 接收訊息
window.addEventListener('message', event => {
  const message = event.data;
  if (typeof onMessage === 'function') {
    onMessage(message);
  }
  // 觸發自定義事件
  window.dispatchEvent(new CustomEvent('webview-message', { detail: message }));
});

// 狀態管理
const state = {
  get: () => vscode.getState() || {},
  set: (newState) => vscode.setState(newState),
  update: (updates) => {
    const current = vscode.getState() || {};
    vscode.setState({ ...current, ...updates });
  }
};

// 日誌
function log(level, ...args) {
  postMessage('log', { level, args: args.map(a => String(a)) });
}

const console = {
  log: (...args) => log('info', ...args),
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
};
`;
}

// 全域單例
let webviewManager: WebviewManager | null = null;

/**
 * 取得 Webview 管理器
 */
export function getWebviewManager(): WebviewManager {
  if (!webviewManager) {
    webviewManager = new WebviewManager();
  }
  return webviewManager;
}

/**
 * 創建 HTML 模板建構器
 */
export function createHtmlBuilder(): HtmlTemplateBuilder {
  return new HtmlTemplateBuilder();
}

/**
 * 註冊 Webview 相關指令
 */
export function registerWebviewCommands(context: vscode.ExtensionContext): void {
  const manager = getWebviewManager();
  manager.initialize(context);

  // 範例：註冊 Note Preview 指令
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.webview.notePreview', async () => {
      const panel = manager.getOrCreatePanel({
        viewType: 'inkstone.notePreview',
        title: 'Note Preview',
        enableScripts: true,
        retainContextWhenHidden: true,
      });

      const builder = createHtmlBuilder()
        .addStyle(DEFAULT_WEBVIEW_STYLES)
        .addScript(createWebviewBridge())
        .setBody(`
          <div class="container">
            <div class="card">
              <h2>Note Preview</h2>
              <p>Select a note to preview its content here.</p>
            </div>
          </div>
        `);

      panel.webview.html = builder.build(panel.webview.cspSource);
    })
  );

  // 清理
  context.subscriptions.push({
    dispose: () => {
      manager.closeAll();
    },
  });
}
