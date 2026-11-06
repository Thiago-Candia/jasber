import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

// Contador de no leídos con entrada animada. No dibuja nada si `count` es 0 o no viene.
// La API todavía no informa no leídos: queda listo para cuando exista.
const UnreadBadge = ({ count = 0 }) => (
  <AnimatePresence initial={false}>
    {count > 0 && (
      <m.span
        className="unread-badge"
        aria-label={`${count} sin leer`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", duration: 0.25, bounce: 0.4 }}
      >
        {count > 99 ? "99+" : count}
      </m.span>
    )}
  </AnimatePresence>
);

export default UnreadBadge;
