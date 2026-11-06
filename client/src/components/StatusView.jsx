import { errorMessage } from "../utils/errors";

export const LoadingState = ({ children = "Cargando..." }) => (
  <div className="state state--loading" role="status">
    <span className="spinner" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

export const EmptyState = ({ title, children }) => (
  <div className="state state--empty">
    {title && <p className="state__title">{title}</p>}
    {children}
  </div>
);

export const ErrorState = ({ error, message, onRetry }) => (
  <div className="state state--error" role="alert">
    <p>{message || errorMessage(error)}</p>
    {onRetry && (
      <button type="button" className="button button--secondary button--small" onClick={onRetry}>
        Reintentar
      </button>
    )}
  </div>
);

// Esqueletos de carga: mantienen la forma del contenido mientras llega, con un brillo suave.

const MESSAGE_ROWS = [
  { name: 22, lines: [78, 52] },
  { name: 16, lines: [64] },
  { name: 26, lines: [88, 70, 34] },
  { name: 18, lines: [48] }
];

export const MessageListSkeleton = ({ children = "Cargando..." }) => (
  <div className="skeleton-messages" role="status" aria-busy="true">
    <span className="visually-hidden">{children}</span>
    {MESSAGE_ROWS.map((row, index) => (
      <div key={index} className="skeleton-message" aria-hidden="true">
        <span className="skeleton skeleton--avatar" />
        <div className="skeleton-message__lines">
          <span className="skeleton skeleton--line" style={{ width: `${row.name}%` }} />
          {row.lines.map((width, lineIndex) => (
            <span key={lineIndex} className="skeleton skeleton--line" style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const SidebarSkeleton = ({ rows = 3, children = "Cargando..." }) => (
  <div className="skeleton-list" role="status" aria-busy="true">
    <span className="visually-hidden">{children}</span>
    {Array.from({ length: rows }, (_, index) => (
      <span
        key={index}
        className="skeleton skeleton--row"
        style={{ width: `${88 - index * 14}%` }}
        aria-hidden="true"
      />
    ))}
  </div>
);
