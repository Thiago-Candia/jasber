import { useEffect, useRef } from "react";

// Atajo global Ctrl+K (Cmd+K en Mac) para abrir la paleta de comandos.
export const useCommandShortcut = (onTrigger) => {
  const handlerRef = useRef(onTrigger);

  useEffect(() => {
    handlerRef.current = onTrigger;
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handlerRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
};
