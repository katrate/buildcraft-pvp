import { useSyncExternalStore } from 'react';
import type { ClientMessage, ServerMessage } from '../../../shared/src/types';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

let ws: WebSocket | null = null;
let status: WsStatus = 'disconnected';
let intentionalClose = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pending: ClientMessage[] = [];

const statusListeners = new Set<() => void>();
const messageListeners = new Set<(msg: ServerMessage) => void>();

function setStatus(s: WsStatus): void {
  if (status === s) return;
  status = s;
  for (const fn of statusListeners) fn();
}

export function serverUrl(): string {
  const port = import.meta.env.VITE_SERVER_PORT ?? '8787';
  return `ws://${window.location.hostname}:${port}`;
}

function scheduleReconnect(): void {
  if (intentionalClose || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSocket();
  }, 1500);
}

function flushPending(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN || pending.length === 0) return;
  const batch = pending;
  pending = [];
  for (const msg of batch) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      pending.push(msg);
    }
  }
}

export function connectSocket(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  intentionalClose = false;
  setStatus('connecting');
  try {
    ws = new WebSocket(serverUrl());
  } catch {
    setStatus('disconnected');
    scheduleReconnect();
    return;
  }
  ws.onopen = () => {
    setStatus('connected');
    flushPending();
  };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data as string) as ServerMessage;
      for (const fn of messageListeners) fn(msg);
    } catch {
      /* ignore malformed */
    }
  };
  ws.onclose = () => {
    ws = null;
    if (!intentionalClose) {
      setStatus('disconnected');
      scheduleReconnect();
    }
  };
  ws.onerror = () => {
    /* onclose follows */
  };
}

export function closeSocket(): void {
  intentionalClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ws?.close();
  ws = null;
  pending = [];
  setStatus('disconnected');
}

// Send immediately when open; queue while (re)connecting so a click right
// after a server restart isn't silently lost. Returns true if accepted.
export function sendMessage(msg: ClientMessage): boolean {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
    return true;
  }
  pending.push(msg);
  if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
    connectSocket();
  }
  return true;
}

export function socketOpen(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}

export function getWsStatus(): WsStatus {
  return status;
}

export function subscribeWsStatus(fn: () => void): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

export function useWsStatus(): WsStatus {
  return useSyncExternalStore(subscribeWsStatus, () => status);
}

export function subscribeMessages(fn: (msg: ServerMessage) => void): () => void {
  messageListeners.add(fn);
  return () => messageListeners.delete(fn);
}
