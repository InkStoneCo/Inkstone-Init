import { type NoteId, type SearchResult } from '@inkstone/codemind-core';
/**
 * 筆記詳情
 */
export interface NoteDetail {
    id: NoteId;
    displayPath: string;
    content: string;
    properties: Record<string, unknown>;
    related: NoteId[];
    backlinks: BacklinkInfo[];
    children: NoteId[];
}
/**
 * Backlink 資訊
 */
export interface BacklinkInfo {
    noteId: NoteId;
    displayPath: string;
    context: string;
}
/**
 * 專案上下文
 */
export interface ProjectContext {
    name: string;
    description: string;
    projectNotes: string[];
    map: string;
    topReferenced: {
        id: NoteId;
        displayPath: string;
        backlinkCount: number;
    }[];
    recent: {
        id: NoteId;
        displayPath: string;
        created: string;
    }[];
}
/**
 * MCP Tools 介面
 */
export interface MCPTools {
    expand_file(filePath: string): Promise<string>;
    get_map(): Promise<string>;
    get_note(noteId: string): Promise<NoteDetail | null>;
    search_notes(query: string, limit?: number): Promise<SearchResult[]>;
    get_backlinks(noteId: string): Promise<BacklinkInfo[]>;
    get_related(noteId: string, depth?: number): Promise<NoteDetail[]>;
    add_note(filePath: string, content: string, parentId?: string): Promise<{
        noteId: string;
    }>;
    get_project_context(): Promise<ProjectContext>;
    reload(): void;
}
/**
 * 建立 MCP Tools
 */
export declare function createMCPTools(codemindPath: string): MCPTools;
//# sourceMappingURL=index.d.ts.map