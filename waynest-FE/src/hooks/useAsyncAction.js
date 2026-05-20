import { useCallback, useState } from "react";

/**
 * Simple hook to track execution state of an async action.
 * Usage:
 * const [running, wrap] = useAsyncAction();
 * <button onClick={wrap(async () => { await doSomething(); })} />
 */
export default function useAsyncAction() {
  const [running, setRunning] = useState(false);

  const wrap = useCallback(
    (fn) => {
      return async (...args) => {
        if (running) return;
        setRunning(true);
        try {
          // Support fn returning a promise
          return await fn(...args);
        } finally {
          setRunning(false);
        }
      };
    },
    [running],
  );

  return [running, wrap];
}
