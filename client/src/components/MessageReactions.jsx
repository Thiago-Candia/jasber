import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { hasReacted } from "../utils/reactions";

const describe = (reaction, mine) => {
  const count = reaction.userIds.length;
  const people = `${count} ${count === 1 ? "persona" : "personas"}`;

  return `${reaction.emoji}, ${people}${mine ? ", incluyéndote" : ""}`;
};

const MessageReactions = ({ reactions, currentUserId, onToggle }) => {
  if (!reactions?.length) return null;

  return (
    <div className="reactions" role="group" aria-label="Reacciones">
      {reactions.map((reaction) => {
        const mine = hasReacted(reaction, currentUserId);
        const count = reaction.userIds.length;

        return (
          <m.button
            key={reaction.emoji}
            type="button"
            className={`reaction ${mine ? "reaction--mine" : ""}`}
            aria-pressed={mine}
            aria-label={describe(reaction, mine)}
            onClick={() => onToggle(reaction.emoji)}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.25, bounce: 0.5 }}
            whileTap={{ scale: 0.92 }}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span className="reaction__count" aria-hidden="true">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.span
                  key={count}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {count}
                </m.span>
              </AnimatePresence>
            </span>
          </m.button>
        );
      })}
    </div>
  );
};

export default MessageReactions;
