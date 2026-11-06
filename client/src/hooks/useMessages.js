import { useCallback, useEffect, useRef } from "react";
import { errorMessage } from "../utils/errors";
import { useResource } from "./useResource";

// Mensajes de una conversación con envío optimista.
//
// Al enviar, el mensaje aparece al instante con `localStatus: "sending"`. Cuando la API
// responde se reemplaza por el mensaje real (conservando `clientId`, así la interfaz no lo
// vuelve a montar). Si falla queda con `localStatus: "failed"` para reintentar o descartar.

let sequence = 0;
const newClientId = () => `local-${Date.now()}-${++sequence}`;

export const useMessages = ({ loadMessages, sendMessage, currentUser }) => {
  const { status, data, error, reload, setData } = useResource(loadMessages);
  const sendRef = useRef(sendMessage);
  const userRef = useRef(currentUser);

  useEffect(() => {
    sendRef.current = sendMessage;
    userRef.current = currentUser;
  });

  const messages = Array.isArray(data) ? data : [];

  const deliver = useCallback(
    async (body, clientId) => {
      try {
        const saved = await sendRef.current(body);

        setData((previous) => {
          const list = previous ?? [];
          const alreadyThere = saved?.id && list.some((item) => item.id === saved.id);

          if (alreadyThere) return list.filter((item) => item.clientId !== clientId);

          return list.map((item) =>
            item.clientId === clientId ? { ...saved, id: saved?.id ?? clientId, clientId, justSent: true } : item
          );
        });
      } catch (caught) {
        setData((previous) =>
          (previous ?? []).map((item) =>
            item.clientId === clientId ? { ...item, localStatus: "failed", sendError: errorMessage(caught) } : item
          )
        );
      }
    },
    [setData]
  );

  const send = useCallback(
    (body) => {
      const clientId = newClientId();
      const draft = {
        id: clientId,
        clientId,
        body,
        created_at: new Date().toISOString(),
        sender: userRef.current ?? null,
        localStatus: "sending"
      };

      setData((previous) => [...(previous ?? []), draft]);

      return deliver(body, clientId);
    },
    [setData, deliver]
  );

  const retry = useCallback(
    (message) => {
      setData((previous) =>
        (previous ?? []).map((item) =>
          item.clientId === message.clientId ? { ...item, localStatus: "sending", sendError: null } : item
        )
      );

      return deliver(message.body, message.clientId);
    },
    [setData, deliver]
  );

  const discard = useCallback(
    (message) => setData((previous) => (previous ?? []).filter((item) => item.clientId !== message.clientId)),
    [setData]
  );

  return { status, messages, error, reload, send, retry, discard };
};
