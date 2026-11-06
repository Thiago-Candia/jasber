import { useId, useState } from "react";

// Sección de la barra lateral que se pliega y despliega con una transición suave.
const SidebarSection = ({ title, defaultOpen = true, children }) => {
  const headingId = useId();
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="sidebar__section" aria-labelledby={headingId}>
      <h2 id={headingId} className="sidebar__heading">
        <button
          type="button"
          className="sidebar__toggle"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((open) => !open)}
        >
          <svg className="sidebar__chevron" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M8.6 5.6 7.2 7l5 5-5 5 1.4 1.4L15 12z" />
          </svg>
          {title}
        </button>
      </h2>
      <div id={contentId} className={`collapsible ${isOpen ? "collapsible--open" : ""}`}>
        <div className="collapsible__inner" inert={!isOpen}>
          {children}
        </div>
      </div>
    </section>
  );
};

export default SidebarSection;
