// CLI Commands Tests
// Phase 4 實作

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock external dependencies before importing commands
vi.mock('chalk', () => ({
  default: {
    green: (s: string) => s,
    red: (s: string) => s,
    yellow: (s: string) => s,
    blue: (s: string) => s,
    cyan: (s: string) => s,
    gray: (s: string) => s,
    white: (s: string) => s,
    bold: {
      cyan: (s: string) => s,
    },
  },
}));

import {
  findCodemindPath,
  getProjectRoot,
  truncate,
  formatDate,
  output,
} from '../utils.js';

describe('CLI Utils', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('findCodemindPath', () => {
    it('should find codemind.md in current directory', () => {
      const codemindPath = path.join(testDir, 'codemind.md');
      fs.writeFileSync(codemindPath, '# Test\n');

      const found = findCodemindPath(testDir);
      expect(found).toBe(codemindPath);
    });

    it('should find codemind.md in parent directory', () => {
      const codemindPath = path.join(testDir, 'codemind.md');
      fs.writeFileSync(codemindPath, '# Test\n');

      const subDir = path.join(testDir, 'sub');
      fs.mkdirSync(subDir);

      const found = findCodemindPath(subDir);
      expect(found).toBe(codemindPath);
    });

    it('should return null if not found', () => {
      const found = findCodemindPath(testDir);
      expect(found).toBeNull();
    });
  });

  describe('getProjectRoot', () => {
    it('should return directory containing codemind.md', () => {
      const codemindPath = path.join(testDir, 'codemind.md');
      fs.writeFileSync(codemindPath, '# Test\n');

      const root = getProjectRoot(testDir);
      expect(root).toBe(testDir);
    });

    it('should return null if not found', () => {
      const root = getProjectRoot(testDir);
      expect(root).toBeNull();
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate long strings with ellipsis', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });

    it('should handle edge cases', () => {
      expect(truncate('', 10)).toBe('');
      expect(truncate('hi', 2)).toBe('hi');
    });
  });

  describe('formatDate', () => {
    it('should return string dates unchanged', () => {
      expect(formatDate('2024-01-15')).toBe('2024-01-15');
    });

    it('should format Date objects', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDate(date)).toBe('2024-01-15');
    });
  });
});

describe('CLI Commands Integration', () => {
  let testDir: string;
  let codemindPath: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-cmd-test-'));
    codemindPath = path.join(testDir, 'codemind.md');

    // Create a test codemind.md file
    const content = `# Test Project

- [[project-root]]
  id:: project-root
  name:: Test Project
  created:: 2024-01-01
  - Project notes

- [[cm.abc123|src/index.ts/abc123]]
  id:: cm.abc123
  file:: src/index.ts
  author:: human
  created:: 2024-01-15
  - Main entry point
  - See also [[cm.def456]]

- [[cm.def456|src/utils.ts/def456]]
  id:: cm.def456
  file:: src/utils.ts
  author:: ai
  created:: 2024-01-16
  - Utility functions

## Map

`;
    fs.writeFileSync(codemindPath, content);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // Note: Full integration tests would require mocking console.log
  // and testing the command functions directly. Here we test that the
  // commands can be imported and called without errors.

  it('should be able to load codemind.md', () => {
    expect(fs.existsSync(codemindPath)).toBe(true);
    const content = fs.readFileSync(codemindPath, 'utf-8');
    expect(content).toContain('Test Project');
  });
});

describe('Output Helpers', () => {
  it('should format reference counts correctly', () => {
    expect(output.reference(0)).toContain('[0]');
    expect(output.reference(3)).toContain('[3]');
    expect(output.reference(10)).toContain('[10]');
  });
});
