import { useCallback, useEffect, useId, useState } from "react";
import { useMessages } from "../hooks/useMessages";
import { useReactions } from "../hooks/useReactions";
import { latestTimestamp, readLastSeen, writeLastSeen } from "../utils/lastSeen";
import MessageComposer from "./MessageComposer";
import MessageList from "./MessageList";
import TypingIndicator from "./TypingIndicator";

const SNIPPET_LENGTH = 80;

const buildSnippet = (body = "") => {
  // Si el mensaje ya era una respuesta, se cita solo lo que escribió la persona.
  const text = body.replace(/^> [^\n]*\n/, "");
  const firstLine = text.split("\n")[0];

  return firstLine.length > SNIPPET_LENGTH ? `${firstLine.slice(0, SNIPPET_LENGTH)}…` : firstLine;
};

// `currentUser`: quien escribe (se usa para mostrar sus mensajes enviándose y sus reacciones).
// `storageKey`: identifica la conversación para recordar qué mensajes ya viste y las reacciones.
// `typingNames`: nombres de quienes están escribiendo (hoy nadie lo informa; ver TypingIndicator).
const Conversation = ({
  title,
  subtitle,
  placeholder,
  loadMessages,
  sendMessage,
  describeError,
  currentUser,
  storageKey,
  typingNames = []
}) => {
  const titleId = useId();
  const currentUserId = currentUser?.id ?? null;
  const { status, messages, error, reload, send, retry, discard } = useMessages({
    loadMessages,
    sendMessage,
    currentUser
  });
  const { reactions, toggle } = useReactions(storageKey, currentUserId);
  const [lastSeen] = useState(() => readLastSeen(storageKey));
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    if (status === "ready") writeLastSeen(storageKey, latestTimestamp(messages));
  }, [status, messages, storageKey]);

  const handleReply = useCallback((message) => {
    const sender = message.sender || {};

    setReplyTo({ name: sender.name || sender.email || "Usuario", snippet: buildSnippet(message.body) });
  }, []);

  const handleSend = (body) => {
    const text = replyTo ? `> ${replyTo.name}: ${replyTo.snippet}\n${body}` : body;

    setReplyTo(null);

    return send(text);
  };

  return (
    <section className="conversation" aria-labelledby={titleId}>
      <header className="conversation__header">
        <h1 id={titleId} className="conversation__title">
          {title}
        </h1>
        {subtitle && <p className="conversation__subtitle">{subtitle}</p>}
      </header>
      <MessageList
        status={status}
        messages={messages}
        errorMessage={status === "error" ? describeError?.(error) : null}
        error={error}
        onRetry={reload}
        currentUserId={currentUserId}
        lastSeen={lastSeen}
        reactions={reactions}
        onToggleReaction={toggle}
        onReply={handleReply}
        onRetrySend={retry}
        onDiscard={discard}
      />
      <TypingIndicator names={typingNames} />
      <MessageComposer
        placeholder={placeholder}
        onSend={handleSend}
        disabled={status !== "ready"}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </section>
  );
};

export default Conversation;
