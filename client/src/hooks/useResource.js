import { useCallback, useEffect, useRef, useState } from "react";

export const useResource = (load, key = "") => {
  const loadRef = useRef(load);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let active = true;

    setState({ status: "loading", data: null, error: null });

    loadRef
      .current()
      .then((data) => {
        if (active) setState({ status: "ready", data, error: null });
      })
      .catch((error) => {
        if (active) setState({ status: "error", data: null, error });
      });

    return () => {
      active = false;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const setData = useCallback(
    (updater) =>
      setState((previous) => ({
        ...previous,
        data: typeof updater === "function" ? updater(previous.data) : updater
      })),
    []
  );

  return { ...state, reload, setData };
};
