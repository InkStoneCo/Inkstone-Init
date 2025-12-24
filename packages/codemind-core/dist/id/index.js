// ID Generator module - 唯一 ID 產生
// Phase 1.6 實作
/**
 * 預設字元集：小寫字母 + 數字
 */
const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
/**
 * ID 驗證正則表達式
 */
const ID_PATTERN = /^cm\.[a-z0-9]{6}$/;
/**
 * 筆記引用正則表達式: [[cm.xxx]] 或 [[cm.xxx|display]]
 */
const REF_PATTERN = /^\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]$/;
/**
 * 建立 ID 產生器實例
 */
export function createIdGenerator(options = {}) {
    const { idLength = 6, alphabet = DEFAULT_ALPHABET, randomFn = Math.random } = options;
    /**
     * 產生隨機 hash
     */
    function generateHash() {
        let hash = '';
        for (let i = 0; i < idLength; i++) {
            const idx = Math.floor(randomFn() * alphabet.length);
            hash += alphabet[idx];
        }
        return hash;
    }
    /**
     * 產生 NoteId
     */
    function generateId() {
        return `cm.${generateHash()}`;
    }
    /**
     * 產生唯一的 NoteId (避免與現有 ID 衝突)
     */
    function generateUniqueId(existingIds) {
        let id;
        let attempts = 0;
        const maxAttempts = 1000;
        do {
            id = generateId();
            attempts++;
            if (attempts >= maxAttempts) {
                throw new Error('Unable to generate unique ID after maximum attempts');
            }
        } while (existingIds.has(id));
        return id;
    }
    /**
     * 驗證 ID 格式
     */
    function isValidId(id) {
        return ID_PATTERN.test(id);
    }
    /**
     * 產生顯示路徑
     */
    function generateDisplayPath(file, id, parentId) {
        const idHash = id.replace('cm.', '');
        if (parentId) {
            const parentHash = parentId.replace('cm.', '');
            return `${file}/${parentHash}/${idHash}`;
        }
        return `${file}/${idHash}`;
    }
    /**
     * 從引用字串提取 ID
     * 支援: [[cm.xxx]] 或 [[cm.xxx|display]]
     */
    function extractIdFromRef(ref) {
        const match = ref.match(REF_PATTERN);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    }
    /**
     * 解析顯示路徑
     */
    function parseDisplayPath(displayPath) {
        const parts = displayPath.split('/');
        if (parts.length < 2) {
            return null;
        }
        // 格式: file/hash 或 file/parentHash/hash
        if (parts.length === 2) {
            return {
                file: parts[0] || '',
                id: parts[1] || '',
            };
        }
        if (parts.length >= 3) {
            // 檔案名可能包含 /，取最後兩個部分作為 parentHash/hash
            const id = parts[parts.length - 1] || '';
            const parentId = parts[parts.length - 2] || '';
            const file = parts.slice(0, parts.length - 2).join('/');
            return {
                file,
                id,
                parentId,
            };
        }
        return null;
    }
    return {
        generateId,
        generateUniqueId,
        isValidId,
        generateDisplayPath,
        extractIdFromRef,
        parseDisplayPath,
    };
}
// 導出預設實例的便捷函數
const defaultGenerator = createIdGenerator();
export const generateId = defaultGenerator.generateId;
export const generateUniqueId = defaultGenerator.generateUniqueId;
export const isValidId = defaultGenerator.isValidId;
export const generateDisplayPath = defaultGenerator.generateDisplayPath;
export const extractIdFromRef = defaultGenerator.extractIdFromRef;
export const parseDisplayPath = defaultGenerator.parseDisplayPath;
//# sourceMappingURL=index.js.map