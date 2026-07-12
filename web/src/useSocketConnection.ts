import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { io, type Socket } from 'socket.io-client';

export type ConnStatus = 'connecting' | 'connected' | 'error';

/** 逾時未連上視為連線失敗（顯示錯誤 + 重試按鈕），避免永久卡在「連線中…」 */
export const CONNECT_TIMEOUT_MS = 7000;

/**
 * 建立並管理一條 socket.io 連線，附加逾時偵測 + 手動重試：
 * - connecting：正在嘗試連線（含斷線後自動重連中）
 * - connected：已連上
 * - error：逾時（CONNECT_TIMEOUT_MS）或 connect_error，UI 應顯示錯誤並提供 retry() 手動重連
 *
 * setup(socket) 由呼叫端掛上自己的業務事件監聽（sg:xxx），每次建立新 socket（含 retry）都會呼叫一次。
 * 不改動 socket 事件協定本身，只管理連線狀態的 UI 呈現。
 */
export function useSocketConnection(
  path: string,
  setup: (socket: Socket) => void,
): { status: ConnStatus; sockRef: RefObject<Socket | null>; retry: () => void } {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const sockRef = useRef<Socket | null>(null);
  const [attempt, setAttempt] = useState(0);
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    setStatus('connecting');
    const s = io({ path, transports: ['websocket', 'polling'] });
    sockRef.current = s;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const armTimeout = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setStatus((prev) => (prev === 'connected' ? prev : 'error'));
      }, CONNECT_TIMEOUT_MS);
    };
    armTimeout();

    s.on('connect', () => {
      if (timer) clearTimeout(timer);
      setStatus('connected');
    });
    s.on('connect_error', () => {
      setStatus((prev) => (prev === 'connected' ? prev : 'error'));
    });
    s.on('disconnect', () => {
      // 斷線後 socket.io 會自動嘗試重連；重新給一輪逾時，逾時仍未連上才報錯
      setStatus('connecting');
      armTimeout();
    });

    setupRef.current(s);

    return () => {
      if (timer) clearTimeout(timer);
      s.close();
    };
  }, [path, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { status, sockRef, retry };
}
