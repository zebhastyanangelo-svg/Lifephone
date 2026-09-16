import '@testing-library/jest-dom/vitest';

class NoopWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = NoopWebSocket.CLOSED;
  url: string;
  protocol = '';
  extensions = '';
  bufferedAmount = 0;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  constructor(url: string | URL, _protocols?: string | string[]) {
    super();
    this.url = typeof url === 'string' ? url : url.toString();
  }

  send(): void {}
  close(): void {}
  terminate(): void {}
}

global.WebSocket = NoopWebSocket as unknown as typeof WebSocket;