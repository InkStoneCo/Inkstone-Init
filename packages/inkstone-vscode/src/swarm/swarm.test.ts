// Swarm 模組單元測試
import { describe, it, expect } from 'vitest';
import {
  SWARM_TOPOLOGIES,
  getSwarmStatus,
  type SwarmTopology,
  type SwarmState,
  type SwarmStatus,
} from './index.js';

describe('Swarm Module', () => {
  describe('SWARM_TOPOLOGIES', () => {
    it('should have 4 topologies', () => {
      expect(SWARM_TOPOLOGIES.length).toBe(4);
    });

    it('should have mesh topology', () => {
      const mesh = SWARM_TOPOLOGIES.find(t => t.id === 'mesh');
      expect(mesh).toBeDefined();
      expect(mesh!.name).toContain('Mesh');
      expect(mesh!.recommended).toBe(true);
    });

    it('should have hierarchical topology', () => {
      const hierarchical = SWARM_TOPOLOGIES.find(t => t.id === 'hierarchical');
      expect(hierarchical).toBeDefined();
      expect(hierarchical!.name).toContain('Hierarchical');
    });

    it('should have ring topology', () => {
      const ring = SWARM_TOPOLOGIES.find(t => t.id === 'ring');
      expect(ring).toBeDefined();
      expect(ring!.name).toContain('Ring');
    });

    it('should have star topology', () => {
      const star = SWARM_TOPOLOGIES.find(t => t.id === 'star');
      expect(star).toBeDefined();
      expect(star!.name).toContain('Star');
    });

    it('should have icons for all topologies', () => {
      SWARM_TOPOLOGIES.forEach(topology => {
        expect(topology.icon).toBeTruthy();
        expect(typeof topology.icon).toBe('string');
      });
    });

    it('should have descriptions for all topologies', () => {
      SWARM_TOPOLOGIES.forEach(topology => {
        expect(topology.description).toBeTruthy();
        expect(typeof topology.description).toBe('string');
      });
    });

    it('should have unique IDs', () => {
      const ids = SWARM_TOPOLOGIES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have only one recommended topology', () => {
      const recommended = SWARM_TOPOLOGIES.filter(t => t.recommended);
      expect(recommended.length).toBe(1);
      expect(recommended[0]!.id).toBe('mesh');
    });
  });

  describe('SwarmTopology interface', () => {
    it('should have correct structure', () => {
      const topology: SwarmTopology = {
        id: 'test',
        name: 'Test Topology',
        description: 'Test Description',
        icon: 'test-icon',
      };

      expect(topology.id).toBe('test');
      expect(topology.recommended).toBeUndefined();
    });

    it('should allow optional recommended flag', () => {
      const topology: SwarmTopology = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        icon: 'icon',
        recommended: true,
      };

      expect(topology.recommended).toBe(true);
    });
  });

  describe('SwarmState type', () => {
    it('should allow valid states', () => {
      const states: SwarmState[] = ['idle', 'initializing', 'running', 'stopping', 'error'];
      expect(states).toHaveLength(5);
    });
  });

  describe('SwarmStatus interface', () => {
    it('should have correct structure', () => {
      const status: SwarmStatus = {
        state: 'idle',
      };

      expect(status.state).toBe('idle');
      expect(status.topology).toBeUndefined();
      expect(status.agentCount).toBeUndefined();
    });

    it('should allow full status information', () => {
      const status: SwarmStatus = {
        state: 'running',
        topology: 'mesh',
        agentCount: 5,
        activeAgents: 3,
        lastUpdate: new Date(),
      };

      expect(status.state).toBe('running');
      expect(status.topology).toBe('mesh');
      expect(status.agentCount).toBe(5);
      expect(status.activeAgents).toBe(3);
      expect(status.lastUpdate).toBeDefined();
    });

    it('should allow error status', () => {
      const status: SwarmStatus = {
        state: 'error',
        errorMessage: 'Connection failed',
      };

      expect(status.state).toBe('error');
      expect(status.errorMessage).toBe('Connection failed');
    });
  });

  describe('getSwarmStatus', () => {
    it('should return status object', () => {
      const status = getSwarmStatus();

      expect(status).toBeDefined();
      expect(status.state).toBeDefined();
    });

    it('should return a copy (immutable)', () => {
      const status1 = getSwarmStatus();
      const status2 = getSwarmStatus();

      expect(status1).not.toBe(status2);
    });

    it('should have idle as initial state', () => {
      const status = getSwarmStatus();
      expect(status.state).toBe('idle');
    });
  });

  describe('Topology recommendations', () => {
    it('mesh should be recommended for collaborative tasks', () => {
      const mesh = SWARM_TOPOLOGIES.find(t => t.id === 'mesh')!;
      expect(mesh.description).toContain('協作');
    });

    it('hierarchical should describe coordinator role', () => {
      const hierarchical = SWARM_TOPOLOGIES.find(t => t.id === 'hierarchical')!;
      expect(hierarchical.description).toContain('主');
    });

    it('ring should describe pipeline processing', () => {
      const ring = SWARM_TOPOLOGIES.find(t => t.id === 'ring')!;
      expect(ring.description).toContain('流水線');
    });

    it('star should describe centralized coordination', () => {
      const star = SWARM_TOPOLOGIES.find(t => t.id === 'star')!;
      expect(star.description).toContain('中心');
    });
  });
});
