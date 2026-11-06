import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { findFirstUnreadId } from "../utils/lastSeen";
import Message from "./Message";
import { EmptyState, ErrorState, MessageListSkeleton } from "./StatusView";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const BOTTOM_THRESHOLD = 80;

const startsGroup = (message, previous) => {
  if (!previous || previous.sender?.id !== message.sender?.id) return true;

  return new Date(message.created_at) - new Date(previous.created_at) > GROUP_WINDOW_MS;
};

const keyOf = (message) => message.clientId ?? message.id;

const Spacer = () => <div className="message-list__spacer" />;
const virtuosoComponents = { Header: Spacer, Footer: Spacer };
const followOutput = (isAtBottom) => (isAtBottom ? "smooth" : false);

const JumpToLatest = ({ unseen, onClick }) => (
  <m.button
    type="button"
    className="jump-to-latest"
    onClick={onClick}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    transition={{ duration: 0.18 }}
  >
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M11 4v12.2l-4.6-4.6L5 13l7 7 7-7-1.4-1.4-4.6 4.6V4z" />
    </svg>
    <span>Ir al último mensaje</span>
    {unseen > 0 && (
      <span className="jump-to-latest__badge" aria-label={`${unseen} ${unseen === 1 ? "mensaje nuevo" : "mensajes nuevos"}`}>
        {unseen}
      </span>
    )}
  </m.button>
);

// Lista ya cargada y con mensajes. Se monta recién cuando hay datos: así la posición inicial
// (en el primer mensaje nuevo o al final) se decide una sola vez.
const LoadedMessageList = ({
  messages,
  currentUserId,
  lastSeen,
  reactions,
  onToggleReaction,
  onReply,
  onRetrySend,
  onDiscard
}) => {
  const virtuosoRef = useRef(null);
  const atBottomRef = useRef(true);
  const previousLengthRef = useRef(messages.length);
  const animatedRef = useRef(new Set());
  const [initialKeys] = useState(() => new Set(messages.map(keyOf)));
  const [firstUnreadId] = useState(() => findFirstUnreadId(messages, lastSeen, currentUserId));
  const [initialIndex] = useState(() => {
    const index = messages.findIndex((message) => message.id === firstUnreadId);

    return index >= 0 ? { index, align: "start" } : { index: "LAST", align: "end" };
  });
  const [isAtBottom, setIsAtBottom] = useState(initialIndex.index === "LAST");
  const [unseen, setUnseen] = useState(0);

  const scrollToLatest = useCallback((behavior = "smooth") => {
    virtuosoRef.current?.scrollToIndex({ index: "LAST", align: "end", behavior });
  }, []);

  useEffect(() => {
    const added = messages.length - previousLengthRef.current;
    previousLengthRef.current = messages.length;
    if (added <= 0) return;

    if (messages[messages.length - 1].localStatus) {
      // Escribiste vos: siempre te llevamos al mensaje nuevo.
      scrollToLatest();
    } else if (!atBottomRef.current) {
      setUnseen((count) => count + added);
    }
  }, [messages, scrollToLatest]);

  const handleAtBottomChange = useCallback((atBottom) => {
    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom) setUnseen(0);
  }, []);

  const renderItem = (index, message) => {
    const key = keyOf(message);
    const isGroupStart = message.id === firstUnreadId || startsGroup(message, messages[index - 1]);

    return (
      <Message
        message={message}
        isGroupStart={isGroupStart}
        showUnreadDivider={message.id === firstUnreadId}
        animateEntry={!initialKeys.has(key) && !animatedRef.current.has(key)}
        onEntryAnimated={() => animatedRef.current.add(key)}
        reactions={reactions[message.id]}
        currentUserId={currentUserId}
        onToggleReaction={onToggleReaction}
        onReply={onReply}
        onRetrySend={onRetrySend}
        onDiscard={onDiscard}
      />
    );
  };

  return (
    <div className="message-list">
      {/* Virtuoso necesita un contenedor con alto definido: este llena el espacio disponible. */}
      <div className="message-list__viewport">
        <Virtuoso
          ref={virtuosoRef}
          role="log"
          aria-label="Mensajes"
          data={messages}
          computeItemKey={(index, message) => keyOf(message)}
          initialTopMostItemIndex={initialIndex}
          followOutput={followOutput}
          atBottomStateChange={handleAtBottomChange}
          atBottomThreshold={BOTTOM_THRESHOLD}
          components={virtuosoComponents}
          itemContent={renderItem}
        />
      </div>
      <AnimatePresence>
        {!isAtBottom && <JumpToLatest unseen={unseen} onClick={() => scrollToLatest()} />}
      </AnimatePresence>
    </div>
  );
};

const MessageList = ({ status, messages, error, errorMessage, onRetry, ...rest }) => {
  if (status === "loading") {
    return (
      <div className="message-list message-list--centered">
        <MessageListSkeleton>Cargando mensajes...</MessageListSkeleton>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="message-list message-list--centered">
        <ErrorState error={error} message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--centered">
        <EmptyState title="Todavía no hay mensajes.">
          <p>Escribí el primero para empezar la conversación.</p>
        </EmptyState>
      </div>
    );
  }

  return <LoadedMessageList messages={messages} {...rest} />;
};

export default MessageList;
