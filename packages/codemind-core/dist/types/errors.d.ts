/**
 * Code-Mind 錯誤代碼
 */
export declare enum ErrorCode {
    PARSE_INVALID_FORMAT = "PARSE_INVALID_FORMAT",
    PARSE_DUPLICATE_ID = "PARSE_DUPLICATE_ID",
    PARSE_MISSING_REQUIRED = "PARSE_MISSING_REQUIRED",
    NOTE_NOT_FOUND = "NOTE_NOT_FOUND",
    NOTE_PARENT_NOT_FOUND = "NOTE_PARENT_NOT_FOUND",
    NOTE_CIRCULAR_REFERENCE = "NOTE_CIRCULAR_REFERENCE",
    FILE_NOT_FOUND = "FILE_NOT_FOUND",
    FILE_WRITE_FAILED = "FILE_WRITE_FAILED",
    DAEMON_ALREADY_RUNNING = "DAEMON_ALREADY_RUNNING",
    DAEMON_NOT_RUNNING = "DAEMON_NOT_RUNNING"
}
/**
 * Code-Mind 自定義錯誤
 */
export declare class CodemindError extends Error {
    code: ErrorCode;
    details?: Record<string, unknown> | undefined;
    constructor(message: string, code: ErrorCode, details?: Record<string, unknown> | undefined);
}
//# sourceMappingURL=errors.d.ts.map