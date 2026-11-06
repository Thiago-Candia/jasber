import { useCallback, useEffect, useRef, useState } from "react";

export const useSubmit = (action) => {
  const actionRef = useRef(action);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    actionRef.current = action;
  });

  const submit = useCallback(async (...args) => {
    if (pendingRef.current) return { ok: false, skipped: true };

    pendingRef.current = true;
    setPending(true);
    setError(null);

    try {
      const data = await actionRef.current(...args);
      return { ok: true, data };
    } catch (caught) {
      setError(caught);
      return { ok: false, error: caught };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  return { submit, pending, error, setError };
};
