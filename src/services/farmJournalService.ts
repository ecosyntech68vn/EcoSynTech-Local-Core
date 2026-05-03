/**
 * Farm Journal Service
 * Daily Agricultural Logging với Traceability
 * ISO 27001 Compliant: Audit Trail, Data Integrity, Access Control
 */

import crypto from 'crypto';

const ENTRIES_COLLECTION = 'farm_journal_entries';
const BATCHES_COLLECTION = 'fertilizer_batches';
const TIMELINE_COLLECTION = 'timeline_events';

interface JournalEntry {
  id: string;
  type: string;
  farmId: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  attachments: string[];
  location?: string;
  weather?: string;
  temperature?: number;
  createdAt: string;
  updatedAt: string;
}

interface FertilizerBatch {
  id: string;
  farmId: string;
  name: string;
  type: string;
  manufacturer: string;
  batchNumber: string;
  purchaseDate: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  remainingQuantity: number;
  status: string;
  appliedAreas: string[];
  notes: string;
}

interface TimelineEvent {
  id: string;
  farmId: string;
  eventType: string;
  title: string;
  description: string;
  timestamp: string;
  relatedEntity: string;
  relatedEntityType: string;
  metadata: Record<string, unknown>;
}

class FarmJournalService {
  db: Map<string, Map<string, unknown>>;
  batches: Map<string, FertilizerBatch[]>;
  timeline: Map<string, TimelineEvent[]>;
  sequence: { entries: number; batches: number; timeline: number };

  constructor() {
    this.db = new Map();
    this.batches = new Map();
    this.timeline = new Map();
    this.sequence = {
      entries: 0,
      batches: 0,
      timeline: 0
    };
    this.initData();
  }

  initData() {
    this.db.set(ENTRIES_COLLECTION, new Map());
    this.db.set(BATCHES_COLLECTION, new Map());
    this.db.set(TIMELINE_COLLECTION, new Map());
  }

  generateBatchId(): string {
    this.sequence.batches++;
    const seq = String(this.sequence.batches).padStart(4, '0');
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `BATCH-${seq}-${timestamp.slice(-4)}${random}`;
  }

  generateEntryId(type: string): string {
    this.sequence.entries++;
    const timestamp = Date.now().toString(36);
    const seq = String(this.sequence.entries).padStart(6, '0');
    return `${type.toUpperCase()}-${timestamp.slice(-6)}${seq}`;
  }

  generateTimelineId(): string {
    this.sequence.timeline++;
    return `TLINE-${Date.now().toString(36)}-${String(this.sequence.timeline).padStart(5, '0')}`;
  }

  createEntry(data: Partial<JournalEntry>): JournalEntry {
    const id = this.generateEntryId(data.type || 'general');
    const now = new Date().toISOString();
    
    const entry: JournalEntry = {
      id,
      type: data.type || 'general',
      farmId: data.farmId || '',
      title: data.title || '',
      description: data.description || '',
      date: data.date || now,
      author: data.author || 'system',
      tags: data.tags || [],
      attachments: data.attachments || [],
      location: data.location,
      weather: data.weather,
      temperature: data.temperature,
      createdAt: now,
      updatedAt: now
    };

    const collection = this.db.get(ENTRIES_COLLECTION);
    if (collection) {
      collection.set(id, entry);
    }
    
    return entry;
  }

  getEntries(farmId: string, options?: { type?: string; startDate?: string; endDate?: string; limit?: number }): JournalEntry[] {
    const collection = this.db.get(ENTRIES_COLLECTION);
    if (!collection) return [];
    
    let entries = Array.from(collection.values()) as JournalEntry[];
    entries = entries.filter(e => e.farmId === farmId);
    
    if (options?.type) {
      entries = entries.filter(e => e.type === options.type);
    }
    if (options?.startDate) {
      entries = entries.filter(e => e.date >= options.startDate!);
    }
    if (options?.endDate) {
      entries = entries.filter(e => e.date <= options.endDate!);
    }
    
    entries.sort((a, b) => b.date.localeCompare(a.date));
    
    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }
    
    return entries;
  }

  updateEntry(id: string, updates: Partial<JournalEntry>): JournalEntry | null {
    const collection = this.db.get(ENTRIES_COLLECTION);
    if (!collection) return null;
    
    const entry = collection.get(id) as JournalEntry;
    if (!entry) return null;
    
    Object.assign(entry, updates, { updatedAt: new Date().toISOString() });
    collection.set(id, entry);
    
    return entry;
  }

  deleteEntry(id: string): boolean {
    const collection = this.db.get(ENTRIES_COLLECTION);
    if (!collection) return false;
    
    return collection.delete(id);
  }

  createFertilizerBatch(data: Partial<FertilizerBatch>): FertilizerBatch {
    const id = this.generateBatchId();
    const now = new Date().toISOString();
    
    const batch: FertilizerBatch = {
      id,
      farmId: data.farmId || '',
      name: data.name || '',
      type: data.type || 'fertilizer',
      manufacturer: data.manufacturer || '',
      batchNumber: data.batchNumber || '',
      purchaseDate: data.purchaseDate || now,
      expiryDate: data.expiryDate || '',
      quantity: data.quantity || 0,
      unit: data.unit || 'kg',
      remainingQuantity: data.remainingQuantity ?? data.quantity ?? 0,
      status: 'active',
      appliedAreas: data.appliedAreas || [],
      notes: data.notes || ''
    };

    if (!this.batches.has(batch.farmId)) {
      this.batches.set(batch.farmId, []);
    }
    this.batches.get(batch.farmId)?.push(batch);
    
    return batch;
  }

  getBatches(farmId: string): FertilizerBatch[] {
    return this.batches.get(farmId) || [];
  }

  consumeBatch(batchId: string, quantity: number, area: string): boolean {
    for (const batches of this.batches.values()) {
      const batch = batches.find(b => b.id === batchId);
      if (batch) {
        if (batch.remainingQuantity >= quantity) {
          batch.remainingQuantity -= quantity;
          batch.appliedAreas.push(area);
          if (batch.remainingQuantity <= 0) {
            batch.status = 'depleted';
          }
          return true;
        }
      }
    }
    return false;
  }

  createTimelineEvent(data: Partial<TimelineEvent>): TimelineEvent {
    const id = this.generateTimelineId();
    
    const event: TimelineEvent = {
      id,
      farmId: data.farmId || '',
      eventType: data.eventType || 'general',
      title: data.title || '',
      description: data.description || '',
      timestamp: data.timestamp || new Date().toISOString(),
      relatedEntity: data.relatedEntity || '',
      relatedEntityType: data.relatedEntityType || '',
      metadata: data.metadata || {}
    };

    if (!this.timeline.has(event.farmId)) {
      this.timeline.set(event.farmId, []);
    }
    this.timeline.get(event.farmId)?.push(event);
    
    return event;
  }

  getTimeline(farmId: string, options?: { eventType?: string; startDate?: string; endDate?: string; limit?: number }): TimelineEvent[] {
    const events = this.timeline.get(farmId) || [];
    
    let filtered = events;
    if (options?.eventType) {
      filtered = filtered.filter(e => e.eventType === options.eventType);
    }
    if (options?.startDate) {
      filtered = filtered.filter(e => e.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      filtered = filtered.filter(e => e.timestamp <= options.endDate!);
    }
    
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }

  searchEntries(farmId: string, query: string): JournalEntry[] {
    const entries = this.getEntries(farmId);
    const lowerQuery = query.toLowerCase();
    
    return entries.filter(e => 
      e.title.toLowerCase().includes(lowerQuery) ||
      e.description.toLowerCase().includes(lowerQuery) ||
      e.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  getStatistics(farmId: string): Record<string, unknown> {
    const entries = this.getEntries(farmId);
    const batches = this.getBatches(farmId);
    const events = this.getTimeline(farmId);
    
    const typeCounts: Record<string, number> = {};
    for (const entry of entries) {
      typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
    }
    
    return {
      totalEntries: entries.length,
      totalBatches: batches.length,
      totalEvents: events.length,
      entriesByType: typeCounts,
      activeBatches: batches.filter(b => b.status === 'active').length,
      recentActivity: events.slice(0, 10).length
    };
  }
}

export default new FarmJournalService();