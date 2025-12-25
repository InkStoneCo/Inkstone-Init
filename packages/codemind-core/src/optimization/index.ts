// Optimization Module - Sprint 12 實作
// 提供效能優化功能：增量載入、快取、延遲計算

import type { Note, NoteId, SearchResult } from '../types/index.js';

/**
 * 分頁結果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 快取項目
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 搜尋快取
 */
export class SearchCache {
  private cache: Map<string, CacheItem<SearchResult[]>> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 100, defaultTTL: number = 60000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * 產生快取鍵
   */
  private generateKey(query: string, limit: number): string {
    return `${query.toLowerCase().trim()}:${limit}`;
  }

  /**
   * 取得快取結果
   */
  get(query: string, limit: number): SearchResult[] | null {
    const key = this.generateKey(query, limit);
    const item = this.cache.get(key);

    if (!item) return null;

    // 檢查是否過期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 設定快取結果
   */
  set(query: string, limit: number, results: SearchResult[], ttl?: number): void {
    // 檢查是否超過最大大小
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const key = this.generateKey(query, limit);
    this.cache.set(key, {
      data: results,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * 清除最舊的項目
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 使特定查詢失效
   */
  invalidate(query: string): void {
    const prefix = query.toLowerCase().trim();
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 取得快取統計
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

/**
 * 分頁管理器
 */
export class PaginationManager<T> {
  private items: T[] = [];
  private pageSize: number;

  constructor(pageSize: number = 20) {
    this.pageSize = pageSize;
  }

  /**
   * 設定資料源
   */
  setItems(items: T[]): void {
    this.items = items;
  }

  /**
   * 取得分頁
   */
  getPage(page: number): PaginatedResult<T> {
    const start = page * this.pageSize;
    const end = start + this.pageSize;
    const items = this.items.slice(start, end);

    return {
      items,
      total: this.items.length,
      page,
      pageSize: this.pageSize,
      hasNext: end < this.items.length,
      hasPrev: page > 0,
    };
  }

  /**
   * 取得總頁數
   */
  getTotalPages(): number {
    return Math.ceil(this.items.length / this.pageSize);
  }

  /**
   * 設定每頁大小
   */
  setPageSize(size: number): void {
    this.pageSize = size;
  }
}

/**
 * 延遲計算包裝器
 */
export class LazyValue<T> {
  private value: T | undefined;
  private computed: boolean = false;
  private computer: () => T;

  constructor(computer: () => T) {
    this.computer = computer;
  }

  /**
   * 取得值（延遲計算）
   */
  get(): T {
    if (!this.computed) {
      this.value = this.computer();
      this.computed = true;
    }
    return this.value!;
  }

  /**
   * 重設（下次取值時重新計算）
   */
  reset(): void {
    this.computed = false;
    this.value = undefined;
  }

  /**
   * 是否已計算
   */
  isComputed(): boolean {
    return this.computed;
  }
}

/**
 * 批次處理器
 */
export class BatchProcessor<T, R> {
  private pending: T[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private processor: (items: T[]) => R[];
  private delay: number;
  private maxBatchSize: number;
  private callback: ((results: R[]) => void) | null = null;

  constructor(
    processor: (items: T[]) => R[],
    options: { delay?: number; maxBatchSize?: number } = {}
  ) {
    this.processor = processor;
    this.delay = options.delay ?? 50;
    this.maxBatchSize = options.maxBatchSize ?? 100;
  }

  /**
   * 新增項目到批次
   */
  add(item: T): void {
    this.pending.push(item);

    // 達到最大批次大小時立即處理
    if (this.pending.length >= this.maxBatchSize) {
      this.flush();
      return;
    }

    // 設定延遲處理
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.delay);
    }
  }

  /**
   * 設定回調
   */
  onComplete(callback: (results: R[]) => void): void {
    this.callback = callback;
  }

  /**
   * 立即處理所有待處理項目
   */
  flush(): R[] {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pending.length === 0) {
      return [];
    }

    const items = [...this.pending];
    this.pending = [];

    const results = this.processor(items);

    if (this.callback) {
      this.callback(results);
    }

    return results;
  }

  /**
   * 取得待處理項目數
   */
  getPendingCount(): number {
    return this.pending.length;
  }
}

/**
 * 增量載入管理器
 */
export class IncrementalLoader<T> {
  private allItems: T[] = [];
  private loadedCount: number = 0;
  private chunkSize: number;
  private isLoading: boolean = false;

  constructor(chunkSize: number = 50) {
    this.chunkSize = chunkSize;
  }

  /**
   * 初始化資料源
   */
  initialize(items: T[]): void {
    this.allItems = items;
    this.loadedCount = 0;
  }

  /**
   * 載入下一批
   */
  loadNext(): { items: T[]; hasMore: boolean; progress: number } {
    if (this.isLoading) {
      return { items: [], hasMore: true, progress: this.getProgress() };
    }

    this.isLoading = true;

    const start = this.loadedCount;
    const end = Math.min(start + this.chunkSize, this.allItems.length);
    const items = this.allItems.slice(start, end);

    this.loadedCount = end;
    this.isLoading = false;

    return {
      items,
      hasMore: end < this.allItems.length,
      progress: this.getProgress(),
    };
  }

  /**
   * 載入所有
   */
  loadAll(): T[] {
    this.loadedCount = this.allItems.length;
    return this.allItems;
  }

  /**
   * 取得進度百分比
   */
  getProgress(): number {
    if (this.allItems.length === 0) return 100;
    return Math.round((this.loadedCount / this.allItems.length) * 100);
  }

  /**
   * 取得已載入項目
   */
  getLoaded(): T[] {
    return this.allItems.slice(0, this.loadedCount);
  }

  /**
   * 重設
   */
  reset(): void {
    this.loadedCount = 0;
    this.isLoading = false;
  }

  /**
   * 是否有更多
   */
  hasMore(): boolean {
    return this.loadedCount < this.allItems.length;
  }
}

/**
 * 筆記索引（快速查詢優化）
 */
export class NoteIndex {
  private byFile: Map<string, Set<NoteId>> = new Map();
  private byTag: Map<string, Set<NoteId>> = new Map();
  private byType: Map<string, Set<NoteId>> = new Map();
  private byDate: Map<string, Set<NoteId>> = new Map();

  /**
   * 建立索引
   */
  build(notes: Note[]): void {
    this.clear();

    for (const note of notes) {
      const id = note.properties.id;

      // 按檔案索引
      const file = note.properties.file;
      if (file) {
        if (!this.byFile.has(file)) {
          this.byFile.set(file, new Set());
        }
        this.byFile.get(file)!.add(id);
      }

      // 按標籤索引
      const tags = note.properties.tags;
      if (tags) {
        for (const tag of tags) {
          if (!this.byTag.has(tag)) {
            this.byTag.set(tag, new Set());
          }
          this.byTag.get(tag)!.add(id);
        }
      }

      // 按類型索引
      const type = note.properties.type;
      if (type) {
        if (!this.byType.has(type)) {
          this.byType.set(type, new Set());
        }
        this.byType.get(type)!.add(id);
      }

      // 按日期索引
      const created = note.properties.created;
      if (created) {
        const date = created.split('T')[0] || created;
        if (!this.byDate.has(date)) {
          this.byDate.set(date, new Set());
        }
        this.byDate.get(date)!.add(id);
      }
    }
  }

  /**
   * 按檔案查詢
   */
  getByFile(file: string): NoteId[] {
    return Array.from(this.byFile.get(file) || []);
  }

  /**
   * 按標籤查詢
   */
  getByTag(tag: string): NoteId[] {
    return Array.from(this.byTag.get(tag) || []);
  }

  /**
   * 按類型查詢
   */
  getByType(type: string): NoteId[] {
    return Array.from(this.byType.get(type) || []);
  }

  /**
   * 按日期查詢
   */
  getByDate(date: string): NoteId[] {
    return Array.from(this.byDate.get(date) || []);
  }

  /**
   * 取得所有標籤
   */
  getAllTags(): string[] {
    return Array.from(this.byTag.keys());
  }

  /**
   * 取得所有類型
   */
  getAllTypes(): string[] {
    return Array.from(this.byType.keys());
  }

  /**
   * 清除索引
   */
  clear(): void {
    this.byFile.clear();
    this.byTag.clear();
    this.byType.clear();
    this.byDate.clear();
  }

  /**
   * 新增筆記到索引
   */
  addNote(note: Note): void {
    const id = note.properties.id;

    if (note.properties.file) {
      if (!this.byFile.has(note.properties.file)) {
        this.byFile.set(note.properties.file, new Set());
      }
      this.byFile.get(note.properties.file)!.add(id);
    }

    if (note.properties.tags) {
      for (const tag of note.properties.tags) {
        if (!this.byTag.has(tag)) {
          this.byTag.set(tag, new Set());
        }
        this.byTag.get(tag)!.add(id);
      }
    }

    if (note.properties.type) {
      if (!this.byType.has(note.properties.type)) {
        this.byType.set(note.properties.type, new Set());
      }
      this.byType.get(note.properties.type)!.add(id);
    }

    if (note.properties.created) {
      const date = note.properties.created.split('T')[0] || note.properties.created;
      if (!this.byDate.has(date)) {
        this.byDate.set(date, new Set());
      }
      this.byDate.get(date)!.add(id);
    }
  }

  /**
   * 從索引移除筆記
   */
  removeNote(note: Note): void {
    const id = note.properties.id;

    if (note.properties.file) {
      this.byFile.get(note.properties.file)?.delete(id);
    }

    if (note.properties.tags) {
      for (const tag of note.properties.tags) {
        this.byTag.get(tag)?.delete(id);
      }
    }

    if (note.properties.type) {
      this.byType.get(note.properties.type)?.delete(id);
    }

    if (note.properties.created) {
      const date = note.properties.created.split('T')[0] || note.properties.created;
      this.byDate.get(date)?.delete(id);
    }
  }
}

// 導出便利函數
export function createSearchCache(maxSize?: number, ttl?: number): SearchCache {
  return new SearchCache(maxSize, ttl);
}

export function createPaginationManager<T>(pageSize?: number): PaginationManager<T> {
  return new PaginationManager(pageSize);
}

export function createIncrementalLoader<T>(chunkSize?: number): IncrementalLoader<T> {
  return new IncrementalLoader(chunkSize);
}

export function createNoteIndex(): NoteIndex {
  return new NoteIndex();
}

export function createLazyValue<T>(computer: () => T): LazyValue<T> {
  return new LazyValue(computer);
}

export function createBatchProcessor<T, R>(
  processor: (items: T[]) => R[],
  options?: { delay?: number; maxBatchSize?: number }
): BatchProcessor<T, R> {
  return new BatchProcessor(processor, options);
}
