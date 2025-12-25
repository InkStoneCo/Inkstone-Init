// Vibe Coding 模組單元測試
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WORKFLOW_STAGES,
  getWorkflowProgress,
  type WorkflowProgress,
  type WorkflowStage,
} from './index.js';

describe('Vibe Coding Module', () => {
  describe('WORKFLOW_STAGES', () => {
    it('should have 5 stages', () => {
      expect(WORKFLOW_STAGES.length).toBe(5);
    });

    it('should have correct stage IDs', () => {
      expect(WORKFLOW_STAGES[0]!.id).toBe(0);
      expect(WORKFLOW_STAGES[1]!.id).toBe(1);
      expect(WORKFLOW_STAGES[2]!.id).toBe(2);
      expect(WORKFLOW_STAGES[3]!.id).toBe(3);
      expect(WORKFLOW_STAGES[4]!.id).toBe(4);
    });

    it('should have correct stage names', () => {
      expect(WORKFLOW_STAGES[0]!.name).toBe('理解需求');
      expect(WORKFLOW_STAGES[1]!.name).toBe('User Story Mapping');
      expect(WORKFLOW_STAGES[2]!.name).toBe('EARS 驗收標準');
      expect(WORKFLOW_STAGES[3]!.name).toBe('系統設計');
      expect(WORKFLOW_STAGES[4]!.name).toBe('任務分解');
    });

    it('should have output files for all stages', () => {
      expect(WORKFLOW_STAGES[0]!.outputFile).toBe('initial-requirements.md');
      expect(WORKFLOW_STAGES[1]!.outputFile).toBe('requirements.md');
      expect(WORKFLOW_STAGES[2]!.outputFile).toBe('requirements.md');
      expect(WORKFLOW_STAGES[3]!.outputFile).toBe('design.md');
      expect(WORKFLOW_STAGES[4]!.outputFile).toBe('tasks.md');
    });

    it('should have icons for all stages', () => {
      WORKFLOW_STAGES.forEach(stage => {
        expect(stage.icon).toBeTruthy();
        expect(typeof stage.icon).toBe('string');
      });
    });

    it('should have descriptions for all stages', () => {
      WORKFLOW_STAGES.forEach(stage => {
        expect(stage.description).toBeTruthy();
        expect(typeof stage.description).toBe('string');
      });
    });
  });

  describe('getWorkflowProgress', () => {
    it('should return initial progress state', () => {
      const progress = getWorkflowProgress();

      expect(progress.state).toBeDefined();
      expect(progress.currentStage).toBeDefined();
      expect(progress.completedStages).toBeDefined();
      expect(Array.isArray(progress.completedStages)).toBe(true);
      expect(progress.completedStages.length).toBe(5);
    });

    it('should return a copy of progress (immutable)', () => {
      const progress1 = getWorkflowProgress();
      const progress2 = getWorkflowProgress();

      // Should be equal but not the same reference
      expect(progress1).toEqual(progress2);
      expect(progress1).not.toBe(progress2);
      expect(progress1.completedStages).not.toBe(progress2.completedStages);
    });
  });

  describe('WorkflowStage interface', () => {
    it('should allow optional outputFile', () => {
      const stage: WorkflowStage = {
        id: 99,
        name: 'Test Stage',
        description: 'Test Description',
        icon: 'test-icon',
      };

      expect(stage.outputFile).toBeUndefined();
    });

    it('should allow outputFile', () => {
      const stage: WorkflowStage = {
        id: 99,
        name: 'Test Stage',
        description: 'Test Description',
        icon: 'test-icon',
        outputFile: 'test.md',
      };

      expect(stage.outputFile).toBe('test.md');
    });
  });

  describe('WorkflowProgress interface', () => {
    it('should have correct type for state', () => {
      const progress: WorkflowProgress = {
        state: 'idle',
        currentStage: 0,
        completedStages: [false, false, false, false, false],
        rfpPath: '',
      };

      expect(['idle', 'active', 'completed']).toContain(progress.state);
    });

    it('should track completed stages correctly', () => {
      const progress: WorkflowProgress = {
        state: 'active',
        currentStage: 2,
        completedStages: [true, true, false, false, false],
        rfpPath: '/test/rfp',
      };

      expect(progress.completedStages.filter(s => s).length).toBe(2);
      expect(progress.currentStage).toBe(2);
    });
  });
});
