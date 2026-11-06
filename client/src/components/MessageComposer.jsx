import { useEffect, useRef, useState } from "react";

// `onSend` se llama sin esperar la respuesta de la API: el mensaje aparece al instante en la
// lista (envío optimista) y ahí mismo se ve si está enviándose o si falló.
const MessageComposer = ({ placeholder, onSend, disabled, replyTo, onCancelReply }) => {
  const [body, setBody] = useState("");
  const formRef = useRef(null);
  const inputRef = useRef(null);
  const trimmed = body.trim();
  const canSend = Boolean(trimmed) && !disabled;

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSend) return;

    onSend(trimmed);
    setBody("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    } else if (event.key === "Escape" && replyTo) {
      onCancelReply?.();
    }
  };

  return (
    <form ref={formRef} className="composer" onSubmit={handleSubmit}>
      {replyTo && (
        <div className="composer__reply">
          <p className="composer__reply-text">
            Respondiendo a <strong>{replyTo.name}</strong>: <span className="muted">{replyTo.snippet}</span>
          </p>
          <button type="button" className="icon-button composer__reply-cancel" onClick={onCancelReply} aria-label="Cancelar respuesta">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
      <div className="composer__box">
        <textarea
          ref={inputRef}
          className="composer__input"
          aria-label="Mensaje"
          placeholder={placeholder}
          rows={1}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button type="submit" className="composer__send" disabled={!canSend} aria-label="Enviar mensaje">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
          </svg>
        </button>
      </div>
    </form>
  );
};

export default MessageComposer;
