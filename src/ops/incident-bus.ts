import { EventEmitter } from 'events';

export interface Alert {
  id?: string;
  type?: string;
  message?: string;
  severity?: string;
  [key: string]: unknown;
}

export interface Incident {
  id?: string;
  type?: string;
  description?: string;
  [key: string]: unknown;
}

export interface Action {
  type: string;
  target?: string;
  payload?: unknown;
  [key: string]: unknown;
}

export class IncidentBus extends EventEmitter {
  emitAlert(alert: Alert): boolean {
    return this.emit('alert', alert);
  }

  emitIncident(incident: Incident): boolean {
    return this.emit('incident', incident);
  }

  emitAction(action: Action): boolean {
    return this.emit('action', action);
  }
}

export default { IncidentBus };