import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSocket } from './testUtils/fakeSocket';
import { useSocketConnection, CONNECT_TIMEOUT_MS } from './useSocketConnection';

// vi.mock 會被 hoist 到檔案最上方，先於一般 import 執行；factory 內若要用外部變數
// 必須透過 vi.hoisted 宣告，避免「Cannot access before initialization」。
const { createdSockets } = vi.hoisted(() => ({ createdSockets: [] as FakeSocket[] }));

vi.mock('socket.io-client', () => ({
  io: () => {
    const s = new FakeSocket();
    createdSockets.push(s);
    return s;
  },
}));

describe('useSocketConnection', () => {
  beforeEach(() => {
    createdSockets.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始狀態為 connecting', () => {
    const { result } = renderHook(() => useSocketConnection('/test/socket', () => {}));
    expect(result.current.status).toBe('connecting');
    expect(createdSockets).toHaveLength(1);
  });

  it('逾時未連上會轉為 error', () => {
    const { result } = renderHook(() => useSocketConnection('/test/socket', () => {}));
    act(() => {
      vi.advanceTimersByTime(CONNECT_TIMEOUT_MS);
    });
    expect(result.current.status).toBe('error');
  });

  it('connect_error 立即轉為 error（不用等滿逾時）', () => {
    const { result } = renderHook(() => useSocketConnection('/test/socket', () => {}));
    act(() => {
      createdSockets[0].trigger('connect_error');
    });
    expect(result.current.status).toBe('error');
  });

  it('收到 connect 會轉為 connected，且不再逾時報錯', () => {
    const { result } = renderHook(() => useSocketConnection('/test/socket', () => {}));
    act(() => {
      createdSockets[0].trigger('connect');
    });
    expect(result.current.status).toBe('connected');

    act(() => {
      vi.advanceTimersByTime(CONNECT_TIMEOUT_MS);
    });
    expect(result.current.status).toBe('connected');
  });

  it('retry() 會關閉舊 socket、建立新 socket，狀態回到 connecting', () => {
    const { result } = renderHook(() => useSocketConnection('/test/socket', () => {}));
    act(() => {
      vi.advanceTimersByTime(CONNECT_TIMEOUT_MS);
    });
    expect(result.current.status).toBe('error');
    const oldSocket = createdSockets[0];

    act(() => {
      result.current.retry();
    });

    expect(oldSocket.closed).toBe(true);
    expect(createdSockets).toHaveLength(2);
    expect(result.current.status).toBe('connecting');

    act(() => {
      createdSockets[1].trigger('connect');
    });
    expect(result.current.status).toBe('connected');
  });

  it('setup(socket) 會在每次建立/重建 socket 時被呼叫，掛上呼叫端自訂事件', () => {
    const setup = vi.fn();
    renderHook(() => useSocketConnection('/test/socket', setup));
    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(createdSockets[0]);
  });
});
