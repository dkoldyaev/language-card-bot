import { StateSyncMercureEvent } from '../../types/mercure.type';

export interface SyncResponse {
  message: string;
  state: StateSyncMercureEvent;
}
