// Processor module - 標記處理器
// Phase 2.2 實作
/**
 * 標記模式
 */
export const PATTERNS = {
    // 新增筆記: {{cm: 內容}} → [[cm.xxx|path]]
    newNote: /\{\{cm:\s*(.+?)\}\}/gs,
    // 子筆記: {{cm.{parentId}: content}} → [[cm.xxx|path]]
    childNote: /\{\{(cm\.[a-z0-9]+):\s*(.+?)\}\}/gs,
    // 更新筆記: [[cm.xxx]]: new content
    updateNote: /\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]:\s*(.+)$/gm,
    // 現有引用: [[cm.xxx]] 或 [[cm.xxx|display]]
    reference: /\[\[(cm\.[a-z0-9]+)(?:\|([^\]]+))?\]\]/g,
};
/**
 * 計算行號
 */
function getLineNumber(content, index) {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
}
/**
 * 建立處理器
 */
export function createProcessor(config) {
    const { generateId, noteExists } = config;
    /**
     * 找出所有標記
     */
    function findMarkers(content) {
        const markers = [];
        // 找出新增筆記標記
        const newNotePattern = new RegExp(PATTERNS.newNote.source, 'gs');
        let match;
        while ((match = newNotePattern.exec(content)) !== null) {
            markers.push({
                type: 'new',
                fullMatch: match[0],
                content: match[1]?.trim() || '',
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                line: getLineNumber(content, match.index),
            });
        }
        // 找出子筆記標記
        const childNotePattern = new RegExp(PATTERNS.childNote.source, 'gs');
        while ((match = childNotePattern.exec(content)) !== null) {
            markers.push({
                type: 'child',
                fullMatch: match[0],
                parentId: match[1],
                content: match[2]?.trim() || '',
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                line: getLineNumber(content, match.index),
            });
        }
        // 找出更新筆記標記
        const updateNotePattern = new RegExp(PATTERNS.updateNote.source, 'gm');
        while ((match = updateNotePattern.exec(content)) !== null) {
            markers.push({
                type: 'update',
                fullMatch: match[0],
                noteId: match[1],
                content: match[2]?.trim() || '',
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                line: getLineNumber(content, match.index),
            });
        }
        // 按位置排序
        markers.sort((a, b) => a.startIndex - b.startIndex);
        return markers;
    }
    /**
     * 找出所有引用
     */
    function findReferences(content) {
        const references = [];
        const pattern = new RegExp(PATTERNS.reference.source, 'g');
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const ref = {
                fullMatch: match[0],
                noteId: match[1],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                line: getLineNumber(content, match.index),
            };
            if (match[2] !== undefined) {
                ref.displayText = match[2];
            }
            references.push(ref);
        }
        return references;
    }
    /**
     * 處理檔案內容
     */
    function processFile(filePath, content) {
        const changes = [];
        const markers = findMarkers(content);
        if (markers.length === 0) {
            return { modified: false, newContent: content, changes };
        }
        // 從後向前處理，避免索引偏移
        let newContent = content;
        const sortedMarkers = [...markers].sort((a, b) => b.startIndex - a.startIndex);
        for (const marker of sortedMarkers) {
            let replacement;
            let change;
            switch (marker.type) {
                case 'new': {
                    const newId = generateId();
                    const displayPath = `${filePath}/${newId.replace('cm.', '')}`;
                    replacement = `[[${newId}|${displayPath}]]`;
                    change = {
                        type: 'create',
                        noteId: newId,
                        content: marker.content,
                        line: marker.line,
                        originalText: marker.fullMatch,
                    };
                    break;
                }
                case 'child': {
                    const parentId = marker.parentId;
                    // 驗證父筆記是否存在
                    if (noteExists && !noteExists(parentId)) {
                        console.warn(`Parent note ${parentId} not found, skipping child creation`);
                        continue;
                    }
                    const newId = generateId();
                    const displayPath = `${filePath}/${parentId.replace('cm.', '')}/${newId.replace('cm.', '')}`;
                    replacement = `[[${newId}|${displayPath}]]`;
                    change = {
                        type: 'create_child',
                        noteId: newId,
                        parentId,
                        content: marker.content,
                        line: marker.line,
                        originalText: marker.fullMatch,
                    };
                    break;
                }
                case 'update': {
                    const noteId = marker.noteId;
                    // 驗證筆記是否存在
                    if (noteExists && !noteExists(noteId)) {
                        console.warn(`Note ${noteId} not found, skipping update`);
                        continue;
                    }
                    // 保留引用但移除更新語法
                    replacement = `[[${noteId}]]`;
                    change = {
                        type: 'update',
                        noteId,
                        content: marker.content,
                        line: marker.line,
                        originalText: marker.fullMatch,
                    };
                    break;
                }
                default:
                    continue;
            }
            // 替換內容
            newContent =
                newContent.substring(0, marker.startIndex) +
                    replacement +
                    newContent.substring(marker.endIndex);
            changes.push(change);
        }
        // 反轉 changes 順序 (因為是從後向前處理)
        changes.reverse();
        return {
            modified: changes.length > 0,
            newContent,
            changes,
        };
    }
    return {
        processFile,
        findMarkers,
        findReferences,
    };
}
/**
 * 檢測多行內容
 * 用於處理跨行的標記內容
 */
export function parseMultilineContent(content) {
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}
/**
 * 格式化為筆記內容
 */
export function formatNoteContent(lines) {
    return lines.map(line => `- ${line}`).join('\n');
}
//# sourceMappingURL=processor.js.map