import type { StateSyncMercureEvent } from '../event_bus/event_bus.type';

export interface SyncResponse {
  message: string;
  state: StateSyncMercureEvent;
}
