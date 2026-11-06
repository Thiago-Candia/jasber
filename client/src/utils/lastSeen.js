import { sameId } from "./format";

// Marca de "última vez que vi esta conversación", guardada en este navegador.
// Sirve para mostrar el separador "Mensajes nuevos" al volver a abrirla.

const PREFIX = "lastSeen:";

export const readLastSeen = (storageKey) => {
  if (!storageKey) return null;

  try {
    const value = Number(localStorage.getItem(`${PREFIX}${storageKey}`));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

export const writeLastSeen = (storageKey, timestamp) => {
  if (!storageKey || !timestamp) return;

  try {
    localStorage.setItem(`${PREFIX}${storageKey}`, String(timestamp));
  } catch {
    // Sin almacenamiento disponible: simplemente no se recuerda.
  }
};

export const latestTimestamp = (messages) =>
  messages.reduce((latest, message) => {
    if (message.localStatus) return latest;
    const time = Date.parse(message.created_at);
    return Number.isNaN(time) ? latest : Math.max(latest, time);
  }, 0);

export const findFirstUnreadId = (messages, lastSeen, currentUserId) => {
  if (!lastSeen) return null;

  const unread = messages.find(
    (message) =>
      !message.localStatus &&
      Date.parse(message.created_at) > lastSeen &&
      !(currentUserId != null && sameId(message.sender?.id, currentUserId))
  );

  return unread?.id ?? null;
};
