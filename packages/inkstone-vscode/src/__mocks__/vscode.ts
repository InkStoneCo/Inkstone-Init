// VSCode API Mock for Testing

export class Uri {
  static file(path: string) {
    return { fsPath: path, path, scheme: 'file' };
  }
  static parse(str: string) {
    return { fsPath: str, path: str, scheme: 'file' };
  }
}

export class EventEmitter<T> {
  private listeners: ((data: T) => void)[] = [];

  event = (listener: (data: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => this.listeners.splice(this.listeners.indexOf(listener), 1) };
  };

  fire(data: T) {
    this.listeners.forEach(l => l(data));
  }

  dispose() {
    this.listeners = [];
  }
}

export const window = {
  showInformationMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  showQuickPick: async () => undefined,
  showInputBox: async () => undefined,
  createOutputChannel: () => ({
    appendLine: () => {},
    append: () => {},
    show: () => {},
    dispose: () => {},
  }),
  createTerminal: () => ({
    sendText: () => {},
    show: () => {},
    dispose: () => {},
  }),
  showTextDocument: async () => undefined,
  createWebviewPanel: () => ({
    webview: { html: '' },
    reveal: () => {},
    dispose: () => {},
  }),
  createTreeView: () => ({
    reveal: async () => {},
    dispose: () => {},
  }),
  withProgress: async (options: unknown, task: () => Promise<unknown>) => task(),
};

export const workspace = {
  workspaceFolders: [{ uri: Uri.file('/test/workspace'), name: 'test', index: 0 }],
  openTextDocument: async () => ({ getText: () => '', uri: Uri.file('/test') }),
  fs: {
    readFile: async () => Buffer.from(''),
    writeFile: async () => {},
    readDirectory: async () => [],
  },
  getConfiguration: () => ({
    get: () => undefined,
    update: async () => {},
  }),
  onDidChangeTextDocument: () => ({ dispose: () => {} }),
  onDidSaveTextDocument: () => ({ dispose: () => {} }),
};

export const commands = {
  registerCommand: (name: string, handler: () => void) => ({ dispose: () => {} }),
  executeCommand: async () => undefined,
};

export class ThemeIcon {
  constructor(public readonly id: string) {}
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class TreeItem {
  label?: string;
  description?: string;
  tooltip?: string;
  collapsibleState?: TreeItemCollapsibleState;
  iconPath?: ThemeIcon;
  contextValue?: string;
  command?: {
    command: string;
    title: string;
    arguments?: unknown[];
  };

  constructor(label: string, collapsibleState?: TreeItemCollapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export const ProgressLocation = {
  Notification: 1,
  Window: 10,
  SourceControl: 11,
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const languages = {
  registerCompletionItemProvider: () => ({ dispose: () => {} }),
  registerHoverProvider: () => ({ dispose: () => {} }),
  registerCodeLensProvider: () => ({ dispose: () => {} }),
  registerDefinitionProvider: () => ({ dispose: () => {} }),
  registerReferenceProvider: () => ({ dispose: () => {} }),
};

export const env = {
  clipboard: {
    writeText: async () => {},
    readText: async () => '',
  },
};

export class Disposable {
  static from(...disposables: { dispose: () => void }[]) {
    return { dispose: () => disposables.forEach(d => d.dispose()) };
  }
}

export default {
  Uri,
  EventEmitter,
  window,
  workspace,
  commands,
  ThemeIcon,
  TreeItemCollapsibleState,
  TreeItem,
  ProgressLocation,
  StatusBarAlignment,
  languages,
  env,
  Disposable,
};
