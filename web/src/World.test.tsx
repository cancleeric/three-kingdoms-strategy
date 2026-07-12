import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSocket } from './testUtils/fakeSocket';
import { CONNECT_TIMEOUT_MS } from './useSocketConnection';
import World from './World';

const { createdSockets } = vi.hoisted(() => ({ createdSockets: [] as FakeSocket[] }));

vi.mock('socket.io-client', () => ({
  io: () => {
    const s = new FakeSocket();
    createdSockets.push(s);
    return s;
  },
}));

describe('World（天下大地圖）連線逾時 + 重試', () => {
  beforeEach(() => {
    createdSockets.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('連線中時顯示「連線中…」與「載入天下…」，不顯示錯誤', () => {
    render(<World />);
    expect(screen.getByText(/連線中…/)).toBeInTheDocument();
    expect(screen.getByText('載入天下…')).toBeInTheDocument();
    expect(screen.queryByText('連線失敗，請確認伺服器已啟動')).not.toBeInTheDocument();
  });

  it('逾時仍未連上，顯示連線失敗 + 重試按鈕（不再永久卡住）', () => {
    render(<World />);
    act(() => {
      vi.advanceTimersByTime(CONNECT_TIMEOUT_MS);
    });
    expect(screen.getByText('連線失敗，請確認伺服器已啟動')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument();
  });

  it('點重試會關閉舊 socket、重新嘗試連線', () => {
    render(<World />);
    act(() => {
      vi.advanceTimersByTime(CONNECT_TIMEOUT_MS);
    });
    const oldSocket = createdSockets[0];
    expect(createdSockets).toHaveLength(1);

    act(() => {
      screen.getByRole('button', { name: '重試' }).click();
    });

    expect(oldSocket.closed).toBe(true);
    expect(createdSockets).toHaveLength(2);
    expect(screen.getByText(/連線中…/)).toBeInTheDocument();
    expect(screen.queryByText('連線失敗，請確認伺服器已啟動')).not.toBeInTheDocument();
  });

  it('重試後連上，顯示已連線（不再卡在載入天下…的錯誤態）', () => {
    render(<World />);
    act(() => {
      vi.advanceTimersByTime(CONNECT_TIMEOUT_MS);
    });
    act(() => {
      screen.getByRole('button', { name: '重試' }).click();
    });
    act(() => {
      createdSockets[1].trigger('connect');
    });
    expect(screen.getByText(/已連線/)).toBeInTheDocument();
    expect(screen.queryByText('連線失敗，請確認伺服器已啟動')).not.toBeInTheDocument();
  });
});
