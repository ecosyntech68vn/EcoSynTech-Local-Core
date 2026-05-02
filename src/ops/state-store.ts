import * as fs from 'fs';
import * as path from 'path';

export interface StateData {
  beats?: Record<string, number>;
  alerts?: Array<{ id: string; signature: string; ts: number }>;
  incidents?: unknown[];
  builds?: unknown[];
  approvals?: unknown[];
  [key: string]: unknown;
}

export class StateStore {
  filePath: string;
  state: StateData;
  
  constructor(filePath: string = path.join(process.cwd(), 'data', 'ops-state.json')) {
    this.filePath = filePath;
    this.state = {
      beats: {},
      alerts: [],
      incidents: [],
      builds: [],
      approvals: []
    };
    this._load();
  }

  private _load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.state = JSON.parse(raw);
      }
    } catch (_) { /* istanbul ignore next */ }
  }

  private _save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    } catch (_) { /* istanbul ignore next */ }
  }

  get(key: string, fallback: unknown = null): unknown {
    return Object.prototype.hasOwnProperty.call(this.state, key) ? this.state[key] : fallback;
  }

  set(key: string, value: unknown): void {
    this.state[key] = value;
    this._save();
  }

  push(key: string, value: unknown, limit: number = 1000): void {
    if (!Array.isArray(this.state[key])) this.state[key] = [];
    (this.state[key] as unknown[]).unshift(value);
    this.state[key] = (this.state[key] as unknown[]).slice(0, limit);
    this._save();
  }
}

export default { StateStore };