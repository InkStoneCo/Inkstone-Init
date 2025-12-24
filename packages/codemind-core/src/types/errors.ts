/**
 * Code-Mind 錯誤代碼
 */
export enum ErrorCode {
  // Parse errors
  PARSE_INVALID_FORMAT = 'PARSE_INVALID_FORMAT',
  PARSE_DUPLICATE_ID = 'PARSE_DUPLICATE_ID',
  PARSE_MISSING_REQUIRED = 'PARSE_MISSING_REQUIRED',

  // Note errors
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',
  NOTE_PARENT_NOT_FOUND = 'NOTE_PARENT_NOT_FOUND',
  NOTE_CIRCULAR_REFERENCE = 'NOTE_CIRCULAR_REFERENCE',

  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',

  // Daemon errors
  DAEMON_ALREADY_RUNNING = 'DAEMON_ALREADY_RUNNING',
  DAEMON_NOT_RUNNING = 'DAEMON_NOT_RUNNING',
}

/**
 * Code-Mind 自定義錯誤
 */
export class CodemindError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CodemindError';
  }
}
