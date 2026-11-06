// "Fulano está escribiendo…". Solo la parte visual: todavía no hay tiempo real que la alimente.
// Cuando exista, alcanza con pasarle `names` desde la conversación.

const describe = (names) => {
  if (names.length === 1) return `${names[0]} está escribiendo`;
  if (names.length === 2) return `${names[0]} y ${names[1]} están escribiendo`;

  return "Varias personas están escribiendo";
};

const TypingIndicator = ({ names = [] }) => {
  const label = names.length > 0 ? describe(names) : "";

  return (
    <div className="typing" role="status" aria-live="polite">
      {names.length > 0 && (
        <>
          <span className="typing__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="typing__label">{label}…</span>
        </>
      )}
    </div>
  );
};

export default TypingIndicator;
