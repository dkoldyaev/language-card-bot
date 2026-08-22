import { UserMode } from '@prisma/client';

export type MercureVersion = 'v1';

export interface BaseMercureEvent {
  version: MercureVersion;
  type: string;
}

export interface StateSyncMercureEvent extends BaseMercureEvent {
  type: 'state_sync';
  mode: UserMode;
}

export interface EchoMercureEvent extends BaseMercureEvent {
  type: 'echo';
  message: string;
  data: unknown;
  user: {
    username: string;
  };
}

export type MercureEvent = StateSyncMercureEvent | EchoMercureEvent;
