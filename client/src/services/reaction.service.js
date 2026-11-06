import { toggleReaction } from "../utils/reactions";

// Capa de reacciones.
//
// La API todavía no tiene endpoints de reacciones, así que hoy se guardan en este
// navegador (localStorage). Cuando existan, solo hay que reemplazar el cuerpo de estas
// funciones por llamadas a `api` (por ejemplo GET/POST/DELETE sobre
// `/messages/:id/reactions`) y el resto de la app no cambia: todo pasa por
// `useReactions`.

const STORAGE_KEY = "reactions:v1";

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
};

const writeAll = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Sin almacenamiento disponible: las reacciones valen solo mientras la pantalla está abierta.
  }
};

export const reactionService = {
  // → { [messageId]: [{ emoji, userIds }] }
  getByConversation: (conversationKey) => Promise.resolve(readAll()[conversationKey] ?? {}),

  // Agrega o quita la reacción de `userId`. Devuelve las reacciones actualizadas del mensaje.
  toggle: (conversationKey, messageId, emoji, userId) => {
    const all = readAll();
    const conversation = all[conversationKey] ?? {};
    const updated = toggleReaction(conversation[messageId], emoji, userId);
    const nextConversation = { ...conversation, [messageId]: updated };

    if (updated.length === 0) delete nextConversation[messageId];
    writeAll({ ...all, [conversationKey]: nextConversation });

    return Promise.resolve(updated);
  }
};
