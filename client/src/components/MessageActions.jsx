import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";

// WorkspaceScreen lo precarga en un rato libre para que el primer uso no espere la descarga.
const EmojiPicker = lazy(() => import("./EmojiPicker"));

// Sin esto, al cerrar un popover Radix devuelve el foco al botón y el tooltip queda pegado.
// Con teclado (foco visible) el tooltip sí se muestra.
const skipTooltipOnProgrammaticFocus = (event) => {
  if (!event.currentTarget.matches(":focus-visible")) event.preventDefault();
};

const Tip = ({ label, children }) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild onFocus={skipTooltipOnProgrammaticFocus}>
      {children}
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content className="tooltip" side="top" sideOffset={6}>
        {label}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
);

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

// Barra que aparece al pasar el mouse (o al enfocar con teclado) sobre un mensaje.
const MessageActions = ({ message, onReact, onReply }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.body);
      toast.success("Mensaje copiado.");
    } catch {
      toast.error("No se pudo copiar el mensaje.");
    }
  };

  return (
    <div
      className="message-actions"
      role="toolbar"
      aria-label="Acciones del mensaje"
      data-open={pickerOpen || menuOpen || undefined}
    >
      <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Tip label="Reaccionar">
          <Popover.Trigger asChild>
            <button type="button" className="message-actions__button" aria-label="Reaccionar con un emoji">
              <Icon>
                <path
                  fill="currentColor"
                  d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-3-9a1.3 1.3 0 1 0 0-2.6A1.3 1.3 0 0 0 9 11Zm6 0a1.3 1.3 0 1 0 0-2.6A1.3 1.3 0 0 0 15 11Zm-3 6c2 0 3.6-1.2 4.2-3H7.8c.6 1.8 2.2 3 4.2 3Z"
                />
              </Icon>
            </button>
          </Popover.Trigger>
        </Tip>
        <Popover.Portal>
          <Popover.Content className="popover popover--picker" side="top" align="end" sideOffset={8} collisionPadding={12}>
            <Suspense fallback={<p className="popover__loading">Cargando emojis...</p>}>
              <EmojiPicker
                onSelect={(emoji) => {
                  onReact(emoji);
                  setPickerOpen(false);
                }}
              />
            </Suspense>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Tip label="Responder">
        <button type="button" className="message-actions__button" aria-label="Responder" onClick={() => onReply(message)}>
          <Icon>
            <path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11Z" />
          </Icon>
        </button>
      </Tip>

      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Tip label="Más opciones">
          <DropdownMenu.Trigger asChild>
            <button type="button" className="message-actions__button" aria-label="Más opciones">
              <Icon>
                <path
                  fill="currentColor"
                  d="M6 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                />
              </Icon>
            </button>
          </DropdownMenu.Trigger>
        </Tip>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu" align="end" sideOffset={6}>
            <DropdownMenu.Item className="menu__item" onSelect={handleCopy}>
              Copiar texto
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};

export default MessageActions;
