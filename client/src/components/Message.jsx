import * as m from "motion/react-m";
import { lazy, Suspense } from "react";
import { formatMessageTime } from "../utils/format";
import Avatar from "./Avatar";
import MessageReactions from "./MessageReactions";

// Una respuesta se guarda como primera línea "> Nombre: texto citado" seguida del mensaje.
const parseBody = (body = "") => {
  const match = /^> ([^\n]*)\n([\s\S]*)$/.exec(body);

  return match ? { quote: match[1], text: match[2] } : { quote: null, text: body };
};

// Radix (menú, popover, tooltip) se baja aparte: la barra recién se ve al pasar el mouse.
const MessageActions = lazy(() => import("./MessageActions"));

const Message = ({
  message,
  isGroupStart,
  showUnreadDivider,
  animateEntry,
  onEntryAnimated,
  reactions,
  currentUserId,
  onToggleReaction,
  onReply,
  onRetrySend,
  onDiscard
}) => {
  const sender = message.sender || {};
  const senderName = sender.name || sender.email || "Usuario";
  const isLocal = Boolean(message.localStatus);
  const { quote, text } = parseBody(message.body);
  const classes = [
    "message",
    isGroupStart && "message--group-start",
    message.localStatus === "sending" && "message--sending",
    message.localStatus === "failed" && "message--failed"
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {showUnreadDivider && (
        <div className="unread-divider" role="separator" aria-label="Mensajes nuevos">
          <span className="unread-divider__label">Mensajes nuevos</span>
        </div>
      )}
      <m.div
        className={classes}
        tabIndex={-1}
        initial={animateEntry ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onAnimationComplete={onEntryAnimated}
      >
        <div className="message__gutter">
          {isGroupStart ? (
            <Avatar name={senderName} src={sender.avatar_url} size="md" shape="square" />
          ) : (
            <time className="message__hover-time" dateTime={message.created_at}>
              {formatMessageTime(message.created_at)}
            </time>
          )}
        </div>
        <div className="message__content">
          {isGroupStart && (
            <p className="message__meta">
              <span className="message__author">{senderName}</span>
              <time className="message__time" dateTime={message.created_at}>
                {formatMessageTime(message.created_at)}
              </time>
            </p>
          )}
          {quote && <blockquote className="message__quote">{quote}</blockquote>}
          <p className="message__body">
            {text}
            {message.justSent && (
              <span className="message__check" aria-hidden="true">
                ✓
              </span>
            )}
          </p>
          {message.localStatus === "sending" && <p className="message__state">Enviando…</p>}
          {message.localStatus === "failed" && (
            <p className="message__error" role="alert">
              <span>No se pudo enviar: {message.sendError}</span>
              <button type="button" className="link-button" onClick={() => onRetrySend(message)}>
                Reintentar
              </button>
              <button type="button" className="link-button" onClick={() => onDiscard(message)}>
                Descartar
              </button>
            </p>
          )}
          {!isLocal && (
            <MessageReactions
              reactions={reactions}
              currentUserId={currentUserId}
              onToggle={(emoji) => onToggleReaction(message.id, emoji)}
            />
          )}
        </div>
        {!isLocal && (
          <Suspense fallback={null}>
            <MessageActions
              message={message}
              onReact={(emoji) => onToggleReaction(message.id, emoji)}
              onReply={onReply}
            />
          </Suspense>
        )}
      </m.div>
    </>
  );
};

export default Message;
