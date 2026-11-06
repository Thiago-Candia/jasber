import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";

// Busca por las palabras clave de cada ítem: primero los que empiezan igual, después los que
// la contienen.
const filter = (value, search, keywords = []) => {
  const query = search.trim().toLowerCase();
  if (!query) return 1;

  const haystack = keywords.join(" ").toLowerCase();
  if (haystack.startsWith(query)) return 1;

  return haystack.includes(query) ? 0.5 : 0;
};

// Paleta Ctrl+K: saltar a un canal o a un mensaje directo, o lanzar una acción del espacio.
const CommandPalette = ({
  open,
  onOpenChange,
  workspace,
  channels,
  currentUser,
  theme,
  onCreateChannel,
  onInvite,
  onToggleTheme
}) => {
  const navigate = useNavigate();
  const channelList = channels.status === "ready" ? channels.data : [];
  const members = workspace.members ?? [];

  const goTo = (path) => {
    onOpenChange(false);
    navigate(`/workspace/${workspace.id}/${path}`);
  };

  const run = (action) => {
    onOpenChange(false);
    action();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Buscar canales, personas y acciones"
      filter={filter}
      className="palette"
      overlayClassName="palette-overlay"
      contentClassName="palette-content"
    >
      <Command.Input className="palette__input" placeholder="Buscar canales, personas o acciones..." />
      <Command.List className="palette__list">
        <Command.Empty className="palette__empty">No hay resultados.</Command.Empty>

        {channelList.length > 0 && (
          <Command.Group heading="Canales" className="palette__group">
            {channelList.map((channel) => (
              <Command.Item
                key={channel.id}
                value={`channel-${channel.id}`}
                keywords={[channel.name]}
                className="palette__item"
                onSelect={() => goTo(`channel/${channel.id}`)}
              >
                <span className="palette__icon" aria-hidden="true">
                  #
                </span>
                {channel.name}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {members.length > 0 && (
          <Command.Group heading="Mensajes directos" className="palette__group">
            {members.map((member) => (
              <Command.Item
                key={member.id}
                value={`member-${member.id}`}
                keywords={[member.name, member.email].filter(Boolean)}
                className="palette__item"
                onSelect={() => goTo(`dm/${member.id}`)}
              >
                <span className="palette__icon" aria-hidden="true">
                  @
                </span>
                {member.name}
                {member.id === currentUser?.id && <span className="muted"> (vos)</span>}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Acciones" className="palette__group">
          <Command.Item
            value="action-create-channel"
            keywords={["crear canal", "nuevo canal"]}
            className="palette__item"
            onSelect={() => run(onCreateChannel)}
          >
            <span className="palette__icon" aria-hidden="true">
              +
            </span>
            Crear un canal
          </Command.Item>
          <Command.Item
            value="action-invite"
            keywords={["invitar personas", "invitar", "link"]}
            className="palette__item"
            onSelect={() => run(onInvite)}
          >
            <span className="palette__icon" aria-hidden="true">
              +
            </span>
            Invitar personas
          </Command.Item>
          <Command.Item
            value="action-theme"
            keywords={["tema", "oscuro", "claro", "modo"]}
            className="palette__item"
            onSelect={() => run(onToggleTheme)}
          >
            <span className="palette__icon" aria-hidden="true">
              ◐
            </span>
            {theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};

export default CommandPalette;
