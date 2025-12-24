// Core type definitions for Code-Mind

/**
 * 筆記 ID - 不可變的唯一識別符
 * 格式: cm.{6字元hash}
 */
export type NoteId = `cm.${string}`;

/**
 * 筆記顯示路徑
 * 格式: {file}/{hash} 或 {file}/{parentHash}/{hash}
 */
export type NotePath = string;

/**
 * 筆記作者
 */
export type NoteAuthor = 'human' | 'ai';

/**
 * 筆記類型
 */
export type NoteType = 'note' | 'memory';

/**
 * 筆記屬性
 */
export interface NoteProperties {
  id: NoteId;
  type?: NoteType;
  file?: string;
  line?: number;
  author: NoteAuthor;
  created: string;
  parent?: NoteId;
  related?: NoteId[];
  backlinks?: NoteId[];
  backlink_count?: number;
  /** Memory 專用：標題 */
  title?: string;
  /** Memory 專用：標籤 */
  tags?: string[];
}

/**
 * 筆記內容行
 */
export interface NoteLine {
  indent: number;
  content: string;
  references?: NoteId[];
}

/**
 * 完整筆記結構
 */
export interface Note {
  properties: NoteProperties;
  content: NoteLine[];
  children: Note[];
  displayPath: NotePath;
}

/**
 * Map 區塊中的筆記條目
 */
export interface NoteMapEntry {
  id: NoteId;
  displayPath: NotePath;
  summary: string;
  backlinkCount: number;
  children?: NoteMapEntry[];
}

/**
 * 檔案的 Map 條目
 */
export interface FileMapEntry {
  file: string;
  notes: NoteMapEntry[];
}

/**
 * Map 區塊
 */
export interface MapSection {
  collapsed: boolean;
  files: FileMapEntry[];
}

/**
 * 專案根結構
 */
export interface ProjectRoot {
  id: 'project-root';
  type: 'project';
  name: string;
  created: string;
  projectNotes: NoteLine[];
  map: MapSection;
}

/**
 * 解析錯誤
 */
export interface ParseError {
  type: 'duplicate_id' | 'invalid_format' | 'missing_required';
  line: number;
  message: string;
}

/**
 * 解析警告
 */
export interface ParseWarning {
  type: 'orphan_reference' | 'nesting_mismatch';
  line: number;
  message: string;
}

/**
 * 解析結果
 */
export interface ParseResult {
  projectRoot: ProjectRoot | null;
  notes: Map<NoteId, Note>;
  forwardLinks: Map<NoteId, NoteId[]>;
  backwardLinks: Map<NoteId, NoteId[]>;
  errors: ParseError[];
  warnings: ParseWarning[];
}

/**
 * 關聯筆記
 */
export interface RelatedNote {
  note: Note;
  direction: 'outgoing' | 'incoming';
  depth: number;
}

/**
 * 搜尋匹配
 */
export interface SearchMatch {
  line: number;
  content: string;
  highlight: [number, number];
}

/**
 * 搜尋結果
 */
export interface SearchResult {
  note: Note;
  matches: SearchMatch[];
  score: number;
}

/**
 * 連結邊
 */
export interface LinkEdge {
  from: NoteId;
  to: NoteId;
  context?: string;
}

/**
 * 連結圖
 */
export interface LinkGraph {
  nodes: NoteId[];
  edges: LinkEdge[];
}
