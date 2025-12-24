/**
 * Code-Mind 錯誤代碼
 */
export var ErrorCode;
(function (ErrorCode) {
    // Parse errors
    ErrorCode["PARSE_INVALID_FORMAT"] = "PARSE_INVALID_FORMAT";
    ErrorCode["PARSE_DUPLICATE_ID"] = "PARSE_DUPLICATE_ID";
    ErrorCode["PARSE_MISSING_REQUIRED"] = "PARSE_MISSING_REQUIRED";
    // Note errors
    ErrorCode["NOTE_NOT_FOUND"] = "NOTE_NOT_FOUND";
    ErrorCode["NOTE_PARENT_NOT_FOUND"] = "NOTE_PARENT_NOT_FOUND";
    ErrorCode["NOTE_CIRCULAR_REFERENCE"] = "NOTE_CIRCULAR_REFERENCE";
    // File errors
    ErrorCode["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
    ErrorCode["FILE_WRITE_FAILED"] = "FILE_WRITE_FAILED";
    // Daemon errors
    ErrorCode["DAEMON_ALREADY_RUNNING"] = "DAEMON_ALREADY_RUNNING";
    ErrorCode["DAEMON_NOT_RUNNING"] = "DAEMON_NOT_RUNNING";
})(ErrorCode || (ErrorCode = {}));
/**
 * Code-Mind 自定義錯誤
 */
export class CodemindError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CodemindError';
    }
}
//# sourceMappingURL=errors.js.map