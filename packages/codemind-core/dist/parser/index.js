// Parser module - 人類友善 MD 解析器
// Phase 1.2 v3 - 支援 Bullet + Indent 格式
/**
 * 正則表達式模式
 */
const PATTERNS = {
    // 專案標題: # Code-Mind Notes
    projectTitle: /^#\s+Code-Mind\s+Notes$/,
    // 專案元數據（bullet 格式）: - Project: xxx
    projectName: /^-\s*Project:\s*(.+)$/,
    projectCreated: /^-\s*Created:\s*(.+)$/,
    // 檔案區塊標題: - ## path/to/file.ts
    fileSection: /^-\s*##\s+(.+)$/,
    // 筆記標題: - [[cm.xxx]] 摘要 或 - [[cm.xxx]]
    noteTitle: /^-\s*\[\[(cm\.[a-z0-9]+)\]\](?:\s+(.*))?$/,
    // 元數據: - author · date 或 - author · date · line X
    noteMeta: /^-\s*(\w+)\s*·\s*(\d{4}-\d{2}-\d{2})(?:\s*·\s*line\s*(\d+))?$/,
    // 筆記引用: [[cm.xxx]] 或 [[cm.xxx|display]]
    noteRef: /\[\[(cm\.[a-z0-9]+)(?:\|([^\]]+))?\]\]/g,
    // 內容行: - 內容
    bulletLine: /^-\s+(.*)$/,
    // 舊格式: - [[cm.xxx|...]]（帶有 display text）
    oldNoteStart: /^-\s*\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]$/,
    // 舊格式屬性: key:: value
    oldProperty: /^([a-z_]+)::\s*(.*)$/,
};
/**
 * 提取筆記引用
 */
function extractReferences(content) {
    const refs = [];
    const regex = new RegExp(PATTERNS.noteRef.source, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
        const id = match[1];
        if (!refs.includes(id)) {
            refs.push(id);
        }
    }
    return refs;
}
/**
 * 計算行的縮排層級（以 2 空格為單位）
 */
function getIndentLevel(line) {
    const match = line.match(/^(\s*)/);
    const spaces = match?.[1]?.length || 0;
    return Math.floor(spaces / 2);
}
/**
 * 解析新格式（Bullet + Indent）
 */
function parseNewFormat(lines) {
    let projectRoot = null;
    const notes = [];
    let currentFile = '';
    let i = 0;
    // 專案資訊
    let projectName = 'Unnamed';
    let projectCreated = new Date().toISOString().split('T')[0] || '';
    while (i < lines.length) {
        const line = lines[i] || '';
        const trimmed = line.trim();
        const indentLevel = getIndentLevel(line);
        // 跳過空行
        if (!trimmed) {
            i++;
            continue;
        }
        // 專案標題
        if (PATTERNS.projectTitle.test(trimmed)) {
            i++;
            continue;
        }
        // 專案名稱
        const nameMatch = trimmed.match(PATTERNS.projectName);
        if (nameMatch) {
            projectName = nameMatch[1] || 'Unnamed';
            i++;
            continue;
        }
        // 專案建立日期
        const createdMatch = trimmed.match(PATTERNS.projectCreated);
        if (createdMatch) {
            projectCreated = createdMatch[1] || '';
            projectRoot = {
                id: 'project-root',
                type: 'project',
                name: projectName,
                created: projectCreated,
                projectNotes: [],
                map: { collapsed: true, files: [] },
            };
            i++;
            continue;
        }
        // 檔案區塊標題: - ## path/to/file.ts
        const fileMatch = trimmed.match(PATTERNS.fileSection);
        if (fileMatch) {
            currentFile = fileMatch[1] || '';
            i++;
            continue;
        }
        // 筆記標題: - [[cm.xxx]] 摘要
        const noteMatch = trimmed.match(PATTERNS.noteTitle);
        if (noteMatch && indentLevel >= 1) {
            const noteId = noteMatch[1];
            const idHash = noteId.replace('cm.', '');
            const note = {
                properties: {
                    id: noteId,
                    file: currentFile,
                    author: 'human',
                    created: new Date().toISOString().split('T')[0] || '',
                },
                content: [],
                children: [],
                displayPath: `${currentFile}/${idHash}`,
            };
            const noteIndent = indentLevel;
            i++;
            // 解析筆記內容（更深層的 bullet）
            while (i < lines.length) {
                const contentLine = lines[i] || '';
                const contentTrimmed = contentLine.trim();
                const contentIndent = getIndentLevel(contentLine);
                // 空行跳過
                if (!contentTrimmed) {
                    i++;
                    continue;
                }
                // 如果縮排比筆記淺或相同，結束這個筆記
                if (contentIndent <= noteIndent) {
                    break;
                }
                // 檢查是否為元數據行
                const metaMatch = contentTrimmed.match(PATTERNS.noteMeta);
                if (metaMatch) {
                    note.properties.author = metaMatch[1];
                    note.properties.created = metaMatch[2] || '';
                    if (metaMatch[3]) {
                        note.properties.line = parseInt(metaMatch[3], 10);
                    }
                    i++;
                    continue;
                }
                // 檢查是否為子筆記
                const childMatch = contentTrimmed.match(PATTERNS.noteTitle);
                if (childMatch && contentIndent === noteIndent + 1) {
                    const childId = childMatch[1];
                    const childHash = childId.replace('cm.', '');
                    const child = {
                        properties: {
                            id: childId,
                            file: currentFile,
                            author: 'human',
                            created: new Date().toISOString().split('T')[0] || '',
                            parent: noteId,
                        },
                        content: [],
                        children: [],
                        displayPath: `${currentFile}/${idHash}/${childHash}`,
                    };
                    const childIndent = contentIndent;
                    i++;
                    // 解析子筆記內容
                    while (i < lines.length) {
                        const childLine = lines[i] || '';
                        const childTrimmed = childLine.trim();
                        const childContentIndent = getIndentLevel(childLine);
                        if (!childTrimmed) {
                            i++;
                            continue;
                        }
                        if (childContentIndent <= childIndent) {
                            break;
                        }
                        // 子筆記元數據
                        const childMetaMatch = childTrimmed.match(PATTERNS.noteMeta);
                        if (childMetaMatch) {
                            child.properties.author = childMetaMatch[1];
                            child.properties.created = childMetaMatch[2] || '';
                            if (childMetaMatch[3]) {
                                child.properties.line = parseInt(childMetaMatch[3], 10);
                            }
                            i++;
                            continue;
                        }
                        // 子筆記內容
                        const childBulletMatch = childTrimmed.match(PATTERNS.bulletLine);
                        if (childBulletMatch) {
                            const relativeIndent = childContentIndent - childIndent - 1;
                            child.content.push({
                                indent: Math.max(0, relativeIndent),
                                content: childBulletMatch[1] || '',
                                references: extractReferences(childBulletMatch[1] || ''),
                            });
                        }
                        i++;
                    }
                    note.children.push(child);
                    continue;
                }
                // 普通內容行
                const bulletMatch = contentTrimmed.match(PATTERNS.bulletLine);
                if (bulletMatch) {
                    const relativeIndent = contentIndent - noteIndent - 1;
                    note.content.push({
                        indent: Math.max(0, relativeIndent),
                        content: bulletMatch[1] || '',
                        references: extractReferences(bulletMatch[1] || ''),
                    });
                }
                i++;
            }
            notes.push(note);
            continue;
        }
        i++;
    }
    // 如果沒有解析到 projectRoot，建立預設的
    if (!projectRoot) {
        projectRoot = {
            id: 'project-root',
            type: 'project',
            name: projectName,
            created: projectCreated,
            projectNotes: [],
            map: { collapsed: true, files: [] },
        };
    }
    return { projectRoot, notes };
}
/**
 * 解析舊格式（Logseq 風格）
 */
function parseOldFormat(lines) {
    let projectRoot = null;
    const notes = [];
    let i = 0;
    // 尋找專案根
    while (i < lines.length) {
        const line = lines[i] || '';
        if (line.includes('id:: project-root')) {
            // 解析專案資訊
            let name = 'Unnamed';
            let created = new Date().toISOString().split('T')[0] || '';
            // 往後找屬性
            let j = i + 1;
            while (j < lines.length && j < i + 10) {
                const propLine = lines[j] || '';
                const nameMatch = propLine.match(/name::\s*(.+)/);
                const createdMatch = propLine.match(/created::\s*(.+)/);
                if (nameMatch)
                    name = nameMatch[1] || name;
                if (createdMatch)
                    created = createdMatch[1] || created;
                j++;
            }
            projectRoot = {
                id: 'project-root',
                type: 'project',
                name,
                created,
                projectNotes: [],
                map: { collapsed: true, files: [] },
            };
            break;
        }
        i++;
    }
    // 解析筆記區塊
    i = 0;
    while (i < lines.length) {
        const line = lines[i] || '';
        const noteMatch = line.match(PATTERNS.oldNoteStart);
        if (noteMatch) {
            const noteId = noteMatch[1];
            const idHash = noteId.replace('cm.', '');
            const note = {
                properties: {
                    id: noteId,
                    author: 'human',
                    created: new Date().toISOString().split('T')[0] || '',
                },
                content: [],
                children: [],
                displayPath: '',
            };
            i++;
            // 解析屬性
            while (i < lines.length) {
                const propLine = lines[i] || '';
                const trimmedProp = propLine.trim();
                // 檢查是否為內容行（以 - 開頭）
                if (trimmedProp.startsWith('- ')) {
                    break;
                }
                // 檢查是否為下一個筆記區塊
                if (propLine.match(PATTERNS.oldNoteStart)) {
                    break;
                }
                // 嘗試匹配屬性（trim 後再匹配）
                const propMatch = trimmedProp.match(PATTERNS.oldProperty);
                if (!propMatch) {
                    i++;
                    continue;
                }
                const key = propMatch[1];
                const value = propMatch[2] || '';
                switch (key) {
                    case 'id':
                        // 已有 ID
                        break;
                    case 'file':
                        note.properties.file = value;
                        break;
                    case 'line':
                        note.properties.line = parseInt(value || '0', 10);
                        break;
                    case 'author':
                        note.properties.author = value || 'human';
                        break;
                    case 'created':
                        note.properties.created = value || '';
                        break;
                    case 'parent':
                        note.properties.parent = value;
                        break;
                }
                i++;
            }
            // 解析內容
            while (i < lines.length) {
                const contentLine = lines[i] || '';
                if (contentLine.match(PATTERNS.oldNoteStart)) {
                    break;
                }
                const bulletMatch = contentLine.match(/^(\s*)- (.*)$/);
                if (bulletMatch) {
                    const indent = Math.floor((bulletMatch[1]?.length || 0) / 2) - 1;
                    const content = bulletMatch[2] || '';
                    if (indent >= 0) {
                        note.content.push({
                            indent,
                            content,
                            references: extractReferences(content),
                        });
                    }
                }
                i++;
            }
            // 設置顯示路徑
            const file = note.properties.file || 'unknown';
            note.displayPath = note.properties.parent
                ? `${file}/${note.properties.parent.replace('cm.', '')}/${idHash}`
                : `${file}/${idHash}`;
            notes.push(note);
            continue;
        }
        i++;
    }
    return { projectRoot, notes };
}
/**
 * 檢測格式類型
 */
function detectFormat(content) {
    // 新格式特徵: - ## (檔案區塊) 或 - [[cm.xxx]] (筆記)
    if (content.includes('- ## ') || /^\s*- \[\[cm\./m.test(content)) {
        // 確認不是舊格式
        if (!content.includes('id:: cm.')) {
            return 'new';
        }
    }
    // 舊格式特徵: id:: cm. 屬性
    if (content.includes('id:: cm.')) {
        return 'old';
    }
    return 'new'; // 預設使用新格式
}
/**
 * 建立正向連結圖
 */
function buildForwardLinks(notes) {
    const forwardLinks = new Map();
    for (const [id, note] of notes) {
        const refs = [];
        // 從 related 屬性收集
        if (note.properties.related) {
            refs.push(...note.properties.related);
        }
        // 從內容中收集
        for (const line of note.content) {
            if (line.references) {
                for (const ref of line.references) {
                    if (!refs.includes(ref)) {
                        refs.push(ref);
                    }
                }
            }
        }
        forwardLinks.set(id, refs);
    }
    return forwardLinks;
}
/**
 * 建立反向連結圖
 */
function buildBackwardLinks(forwardLinks) {
    const backwardLinks = new Map();
    for (const [fromId, toIds] of forwardLinks) {
        for (const toId of toIds) {
            const existing = backwardLinks.get(toId) || [];
            if (!existing.includes(fromId)) {
                existing.push(fromId);
            }
            backwardLinks.set(toId, existing);
        }
    }
    return backwardLinks;
}
/**
 * 收集所有筆記（包含子筆記）到 Map
 */
function collectNotes(notes, target) {
    for (const note of notes) {
        target.set(note.properties.id, note);
        if (note.children.length > 0) {
            collectNotes(note.children, target);
        }
    }
}
/**
 * 檢查重複 ID
 */
function checkDuplicateIds(notes, seen, errors) {
    for (const note of notes) {
        if (seen.has(note.properties.id)) {
            errors.push({
                type: 'duplicate_id',
                line: 0,
                message: `Duplicate note ID: ${note.properties.id}`,
            });
        }
        seen.add(note.properties.id);
        checkDuplicateIds(note.children, seen, errors);
    }
}
/**
 * 檢查孤立引用
 */
function checkOrphanReferences(notes, forwardLinks, warnings) {
    for (const [fromId, toIds] of forwardLinks) {
        for (const toId of toIds) {
            if (!notes.has(toId)) {
                warnings.push({
                    type: 'orphan_reference',
                    line: 0,
                    message: `Note ${fromId} references non-existent note ${toId}`,
                });
            }
        }
    }
}
/**
 * 主解析函數
 */
function parse(content) {
    const errors = [];
    const warnings = [];
    // 檢測格式
    const format = detectFormat(content);
    const lines = content.split('\n');
    // 解析
    const { projectRoot, notes } = format === 'new' ? parseNewFormat(lines) : parseOldFormat(lines);
    // 收集所有筆記到 Map
    const notesMap = new Map();
    collectNotes(notes, notesMap);
    // 檢查重複 ID
    const seenIds = new Set();
    checkDuplicateIds(notes, seenIds, errors);
    // 建立連結圖
    const forwardLinks = buildForwardLinks(notesMap);
    const backwardLinks = buildBackwardLinks(forwardLinks);
    // 檢查孤立引用
    checkOrphanReferences(notesMap, forwardLinks, warnings);
    return {
        projectRoot,
        notes: notesMap,
        forwardLinks,
        backwardLinks,
        errors,
        warnings,
    };
}
/**
 * 解析單一筆記區塊（用於測試）
 */
function parseNoteBlock(lines, _startLine) {
    const content = lines.join('\n');
    const result = parse(content);
    const notes = [...result.notes.values()];
    return notes[0] || null;
}
/**
 * 建立 Parser 實例
 */
export function createParser() {
    return {
        parse,
        parseNoteBlock,
        extractReferences,
    };
}
// 導出輔助函數供測試使用
export { extractReferences, detectFormat, parseNewFormat, parseOldFormat };
// 兼容舊的導出
export function parseLine(line, lineNumber) {
    return {
        lineNumber,
        indent: 0,
        content: line,
        isBullet: line.trim().startsWith('- '),
        raw: line,
    };
}
export function parseProperty(content) {
    const match = content.match(PATTERNS.oldProperty);
    if (match) {
        return { key: match[1] || '', value: match[2] || '' };
    }
    return null;
}
export function isNoteBlockStart(content) {
    const match = content.match(/\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]/);
    return match ? match[1] : null;
}
//# sourceMappingURL=index.js.map