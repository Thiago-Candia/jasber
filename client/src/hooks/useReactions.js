import { useCallback } from "react";
import { reactionService } from "../services";
import { toggleReaction } from "../utils/reactions";
import { useResource } from "./useResource";

const EMPTY = Object.freeze({});

// Reacciones de una conversación. Si no hay `conversationKey` viven solo en memoria.
export const useReactions = (conversationKey, currentUserId) => {
  const { data, setData, reload } = useResource(
    () => (conversationKey ? reactionService.getByConversation(conversationKey) : Promise.resolve({})),
    conversationKey ?? ""
  );

  const toggle = useCallback(
    (messageId, emoji) => {
      setData((previous) => ({
        ...previous,
        [messageId]: toggleReaction(previous?.[messageId], emoji, currentUserId)
      }));

      if (conversationKey) {
        reactionService.toggle(conversationKey, messageId, emoji, currentUserId).catch(reload);
      }
    },
    [conversationKey, currentUserId, setData, reload]
  );

  return { reactions: data ?? EMPTY, toggle };
};
