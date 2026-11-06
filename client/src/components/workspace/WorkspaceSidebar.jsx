import { useAutoAnimate } from "@formkit/auto-animate/react";
import { NavLink } from "react-router-dom";
import Avatar from "../Avatar";
import PresenceDot from "../PresenceDot";
import { ErrorState, SidebarSkeleton } from "../StatusView";
import UnreadBadge from "../UnreadBadge";
import SidebarSection from "./SidebarSection";

const navClass = ({ isActive }) => `sidebar-link ${isActive ? "sidebar-link--active" : ""}`;
const ANIMATION = { duration: 180 };

// `unreadCounts`: { "channel:3": 2, "dm:7": 1 }. La API todavía no informa no leídos, así que
// hoy llega vacío y los contadores no se muestran.
const WorkspaceSidebar = ({
  id,
  workspace,
  channels,
  currentUser,
  isOpen,
  unreadCounts = {},
  onCreateChannel,
  onInvite
}) => {
  const [channelListRef] = useAutoAnimate(ANIMATION);
  const [memberListRef] = useAutoAnimate(ANIMATION);
  const members = [...(workspace.members ?? [])].sort((a, b) => (a.id === currentUser?.id ? -1 : b.id === currentUser?.id ? 1 : 0));

  return (
    <nav id={id} className={`sidebar ${isOpen ? "sidebar--open" : ""}`} aria-label={`Navegación de ${workspace.name}`}>
      <SidebarSection title="Canales">
        {channels.status === "loading" && <SidebarSkeleton>Cargando canales...</SidebarSkeleton>}
        {channels.status === "error" && <ErrorState error={channels.error} onRetry={channels.reload} />}
        {channels.status === "ready" && channels.data.length === 0 && <p className="sidebar__empty">No hay canales todavía.</p>}
        {channels.status === "ready" && channels.data.length > 0 && (
          <ul ref={channelListRef} className="sidebar__list">
            {channels.data.map((channel) => (
              <li key={channel.id}>
                <NavLink to={`channel/${channel.id}`} className={navClass}>
                  <span className="sidebar-link__icon" aria-hidden="true">
                    #
                  </span>
                  <span className="sidebar-link__label">{channel.name}</span>
                  <UnreadBadge count={unreadCounts[`channel:${channel.id}`]} />
                </NavLink>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="sidebar__action" onClick={onCreateChannel}>
          + Agregar canal
        </button>
      </SidebarSection>

      <SidebarSection title="Mensajes directos">
        <ul ref={memberListRef} className="sidebar__list">
          {members.map((member) => (
            <li key={member.id}>
              <NavLink to={`dm/${member.id}`} className={navClass}>
                <Avatar name={member.name} src={member.avatar_url} size="xs" />
                <span className="sidebar-link__label">
                  {member.name}
                  {member.id === currentUser?.id && <span className="muted"> (vos)</span>}
                </span>
                <PresenceDot status={member.presence} />
                <UnreadBadge count={unreadCounts[`dm:${member.id}`]} />
              </NavLink>
            </li>
          ))}
        </ul>
        <button type="button" className="sidebar__action" onClick={onInvite}>
          + Invitar personas
        </button>
      </SidebarSection>
    </nav>
  );
};

export default WorkspaceSidebar;
