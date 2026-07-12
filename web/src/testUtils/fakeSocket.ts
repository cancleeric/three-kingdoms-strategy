// 測試用假 socket：不連真的網路，讓測試能手動觸發 connect/connect_error/disconnect
// 等事件，驗證 useSocketConnection 的逾時 + 重試狀態機。
type Listener = (...args: unknown[]) => void;

export class FakeSocket {
  id = 'fake-' + Math.random().toString(36).slice(2);
  closed = false;
  private listeners = new Map<string, Listener[]>();

  on(event: string, cb: Listener): this {
    const arr = this.listeners.get(event) ?? [];
    arr.push(cb);
    this.listeners.set(event, arr);
    return this;
  }

  off(): this {
    return this;
  }

  emit(): this {
    // 測試不需要模擬 server 端 ack，忽略呼叫即可
    return this;
  }

  close(): void {
    this.closed = true;
  }

  /** 測試用：模擬 server/manager 觸發事件（如 connect / connect_error / disconnect） */
  trigger(event: string, ...args: unknown[]): void {
    for (const cb of this.listeners.get(event) ?? []) cb(...args);
  }
}
