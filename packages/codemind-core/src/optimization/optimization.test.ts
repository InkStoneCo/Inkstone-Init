// Optimization 模組單元測試
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SearchCache,
  PaginationManager,
  IncrementalLoader,
  NoteIndex,
  LazyValue,
  BatchProcessor,
  createSearchCache,
  createPaginationManager,
  createIncrementalLoader,
  createNoteIndex,
  createLazyValue,
  createBatchProcessor,
} from './index.js';

describe('Optimization Module', () => {
  describe('SearchCache', () => {
    let cache: SearchCache;

    beforeEach(() => {
      cache = new SearchCache(10, 1000);
    });

    it('should store and retrieve results', () => {
      const results = [{ note: {} as any, matches: [], score: 1 }];
      cache.set('test query', 10, results);

      const retrieved = cache.get('test query', 10);
      expect(retrieved).toEqual(results);
    });

    it('should return null for missing keys', () => {
      const result = cache.get('nonexistent', 10);
      expect(result).toBeNull();
    });

    it('should be case insensitive', () => {
      const results = [{ note: {} as any, matches: [], score: 1 }];
      cache.set('Test Query', 10, results);

      const retrieved = cache.get('test query', 10);
      expect(retrieved).toEqual(results);
    });

    it('should respect limit in cache key', () => {
      const results10 = [{ note: {} as any, matches: [], score: 1 }];
      const results20 = [{ note: {} as any, matches: [], score: 2 }];

      cache.set('query', 10, results10);
      cache.set('query', 20, results20);

      expect(cache.get('query', 10)).toEqual(results10);
      expect(cache.get('query', 20)).toEqual(results20);
    });

    it('should expire old entries', async () => {
      const results = [{ note: {} as any, matches: [], score: 1 }];
      const shortCache = new SearchCache(10, 10); // 10ms TTL

      shortCache.set('test', 10, results);
      expect(shortCache.get('test', 10)).toEqual(results);

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(shortCache.get('test', 10)).toBeNull();
    });

    it('should clear all entries', () => {
      cache.set('q1', 10, []);
      cache.set('q2', 10, []);
      cache.clear();

      expect(cache.get('q1', 10)).toBeNull();
      expect(cache.get('q2', 10)).toBeNull();
    });

    it('should invalidate by prefix', () => {
      cache.set('user search', 10, []);
      cache.set('user query', 10, []);
      cache.set('other', 10, []);

      cache.invalidate('user');

      expect(cache.get('user search', 10)).toBeNull();
      expect(cache.get('user query', 10)).toBeNull();
      expect(cache.get('other', 10)).not.toBeNull();
    });

    it('should provide stats', () => {
      cache.set('q1', 10, []);
      cache.set('q2', 10, []);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
    });
  });

  describe('PaginationManager', () => {
    let paginator: PaginationManager<number>;

    beforeEach(() => {
      paginator = new PaginationManager(5);
      paginator.setItems([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('should return first page', () => {
      const result = paginator.getPage(0);

      expect(result.items).toEqual([1, 2, 3, 4, 5]);
      expect(result.page).toBe(0);
      expect(result.hasPrev).toBe(false);
      expect(result.hasNext).toBe(true);
    });

    it('should return middle page', () => {
      const result = paginator.getPage(1);

      expect(result.items).toEqual([6, 7, 8, 9, 10]);
      expect(result.page).toBe(1);
      expect(result.hasPrev).toBe(true);
      expect(result.hasNext).toBe(true);
    });

    it('should return last page', () => {
      const result = paginator.getPage(2);

      expect(result.items).toEqual([11, 12]);
      expect(result.page).toBe(2);
      expect(result.hasPrev).toBe(true);
      expect(result.hasNext).toBe(false);
    });

    it('should calculate total correctly', () => {
      const result = paginator.getPage(0);
      expect(result.total).toBe(12);
    });

    it('should calculate total pages', () => {
      expect(paginator.getTotalPages()).toBe(3);
    });

    it('should handle empty items', () => {
      paginator.setItems([]);
      const result = paginator.getPage(0);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('should allow changing page size', () => {
      paginator.setPageSize(3);
      expect(paginator.getTotalPages()).toBe(4);
    });
  });

  describe('IncrementalLoader', () => {
    let loader: IncrementalLoader<string>;

    beforeEach(() => {
      loader = new IncrementalLoader(3);
      loader.initialize(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    });

    it('should load first chunk', () => {
      const result = loader.loadNext();

      expect(result.items).toEqual(['a', 'b', 'c']);
      expect(result.hasMore).toBe(true);
      expect(result.progress).toBeGreaterThan(0);
    });

    it('should load subsequent chunks', () => {
      loader.loadNext(); // first chunk
      const result = loader.loadNext(); // second chunk

      expect(result.items).toEqual(['d', 'e', 'f']);
      expect(result.hasMore).toBe(true);
    });

    it('should load final chunk', () => {
      loader.loadNext();
      loader.loadNext();
      const result = loader.loadNext();

      expect(result.items).toEqual(['g']);
      expect(result.hasMore).toBe(false);
      expect(result.progress).toBe(100);
    });

    it('should track progress', () => {
      expect(loader.getProgress()).toBe(0);

      loader.loadNext();
      expect(loader.getProgress()).toBeGreaterThan(0);
      expect(loader.getProgress()).toBeLessThan(100);

      loader.loadAll();
      expect(loader.getProgress()).toBe(100);
    });

    it('should get loaded items', () => {
      loader.loadNext();
      expect(loader.getLoaded()).toEqual(['a', 'b', 'c']);

      loader.loadNext();
      expect(loader.getLoaded()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });

    it('should reset correctly', () => {
      loader.loadNext();
      loader.reset();

      expect(loader.getProgress()).toBe(0);
      expect(loader.getLoaded()).toEqual([]);
      expect(loader.hasMore()).toBe(true);
    });

    it('should load all at once', () => {
      const all = loader.loadAll();

      expect(all).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      expect(loader.hasMore()).toBe(false);
    });
  });

  describe('LazyValue', () => {
    it('should compute value on first access', () => {
      const computer = vi.fn(() => 42);
      const lazy = new LazyValue(computer);

      expect(computer).not.toHaveBeenCalled();

      const value = lazy.get();
      expect(value).toBe(42);
      expect(computer).toHaveBeenCalledTimes(1);
    });

    it('should cache computed value', () => {
      const computer = vi.fn(() => Math.random());
      const lazy = new LazyValue(computer);

      const first = lazy.get();
      const second = lazy.get();

      expect(first).toBe(second);
      expect(computer).toHaveBeenCalledTimes(1);
    });

    it('should track computed state', () => {
      const lazy = new LazyValue(() => 'value');

      expect(lazy.isComputed()).toBe(false);
      lazy.get();
      expect(lazy.isComputed()).toBe(true);
    });

    it('should reset and recompute', () => {
      let counter = 0;
      const lazy = new LazyValue(() => ++counter);

      expect(lazy.get()).toBe(1);
      expect(lazy.get()).toBe(1);

      lazy.reset();
      expect(lazy.isComputed()).toBe(false);
      expect(lazy.get()).toBe(2);
    });
  });

  describe('BatchProcessor', () => {
    it('should process items in batches', async () => {
      const processor = vi.fn((items: number[]) => items.map(x => x * 2));
      const batch = new BatchProcessor(processor, { delay: 10, maxBatchSize: 5 });

      batch.add(1);
      batch.add(2);
      batch.add(3);

      // Wait for batch to process
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should flush immediately when max batch size reached', () => {
      const processor = vi.fn((items: number[]) => items);
      const batch = new BatchProcessor(processor, { maxBatchSize: 3 });

      batch.add(1);
      batch.add(2);
      batch.add(3);

      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should call callback on complete', () => {
      const processor = (items: number[]) => items.map(x => x * 2);
      const callback = vi.fn();
      const batch = new BatchProcessor(processor, { maxBatchSize: 2 });

      batch.onComplete(callback);
      batch.add(1);
      batch.add(2);

      expect(callback).toHaveBeenCalledWith([2, 4]);
    });

    it('should flush manually', () => {
      const processor = (items: number[]) => items;
      const batch = new BatchProcessor(processor, { delay: 1000 });

      batch.add(1);
      batch.add(2);

      const result = batch.flush();
      expect(result).toEqual([1, 2]);
    });

    it('should track pending count', () => {
      const batch = new BatchProcessor((items: number[]) => items, { delay: 1000 });

      expect(batch.getPendingCount()).toBe(0);

      batch.add(1);
      batch.add(2);
      expect(batch.getPendingCount()).toBe(2);

      batch.flush();
      expect(batch.getPendingCount()).toBe(0);
    });
  });

  describe('NoteIndex', () => {
    let index: NoteIndex;

    beforeEach(() => {
      index = new NoteIndex();
    });

    it('should build index from notes', () => {
      const notes = [
        {
          properties: { id: 'cm.001' as any, file: 'file1.md', tags: ['tag1'], type: 'memory', created: '2024-01-01' },
          content: [],
          children: [],
          displayPath: 'file1.md/001',
        },
        {
          properties: { id: 'cm.002' as any, file: 'file2.md', tags: ['tag1', 'tag2'], type: 'note', created: '2024-01-02' },
          content: [],
          children: [],
          displayPath: 'file2.md/002',
        },
      ];

      index.build(notes);

      expect(index.getByFile('file1.md')).toEqual(['cm.001']);
      expect(index.getByTag('tag1')).toHaveLength(2);
      expect(index.getByType('memory')).toEqual(['cm.001']);
      expect(index.getByDate('2024-01-01')).toEqual(['cm.001']);
    });

    it('should return all tags', () => {
      const notes = [
        { properties: { id: 'cm.001' as any, tags: ['a', 'b'] }, content: [], children: [], displayPath: '' },
        { properties: { id: 'cm.002' as any, tags: ['b', 'c'] }, content: [], children: [], displayPath: '' },
      ];

      index.build(notes);

      const tags = index.getAllTags();
      expect(tags).toContain('a');
      expect(tags).toContain('b');
      expect(tags).toContain('c');
    });

    it('should add note to index', () => {
      const note = {
        properties: { id: 'cm.new' as any, file: 'new.md', type: 'test' },
        content: [],
        children: [],
        displayPath: 'new.md/new',
      };

      index.addNote(note);

      expect(index.getByFile('new.md')).toEqual(['cm.new']);
      expect(index.getByType('test')).toEqual(['cm.new']);
    });

    it('should remove note from index', () => {
      const note = {
        properties: { id: 'cm.del' as any, file: 'del.md', type: 'temp' },
        content: [],
        children: [],
        displayPath: 'del.md/del',
      };

      index.addNote(note);
      expect(index.getByFile('del.md')).toEqual(['cm.del']);

      index.removeNote(note);
      expect(index.getByFile('del.md')).toEqual([]);
    });

    it('should clear all indexes', () => {
      const notes = [
        { properties: { id: 'cm.001' as any, file: 'f1.md' }, content: [], children: [], displayPath: '' },
      ];

      index.build(notes);
      index.clear();

      expect(index.getByFile('f1.md')).toEqual([]);
      expect(index.getAllTags()).toEqual([]);
    });
  });

  describe('Factory Functions', () => {
    it('should create SearchCache', () => {
      const cache = createSearchCache(50, 5000);
      expect(cache).toBeInstanceOf(SearchCache);
    });

    it('should create PaginationManager', () => {
      const paginator = createPaginationManager<number>(10);
      expect(paginator).toBeInstanceOf(PaginationManager);
    });

    it('should create IncrementalLoader', () => {
      const loader = createIncrementalLoader<string>(25);
      expect(loader).toBeInstanceOf(IncrementalLoader);
    });

    it('should create NoteIndex', () => {
      const noteIndex = createNoteIndex();
      expect(noteIndex).toBeInstanceOf(NoteIndex);
    });

    it('should create LazyValue', () => {
      const lazy = createLazyValue(() => 'test');
      expect(lazy).toBeInstanceOf(LazyValue);
    });

    it('should create BatchProcessor', () => {
      const batch = createBatchProcessor((items: number[]) => items);
      expect(batch).toBeInstanceOf(BatchProcessor);
    });
  });
});
