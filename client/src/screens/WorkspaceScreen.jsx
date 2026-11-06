import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Avatar from "../components/Avatar";
import Brand from "../components/Brand";
import { ErrorState, LoadingState } from "../components/StatusView";
import UserButton from "../components/UserButton";
import CreateChannelModal from "../components/workspace/CreateChannelModal";
import InviteModal from "../components/workspace/InviteModal";
import WorkspaceSidebar from "../components/workspace/WorkspaceSidebar";
import { useTheme } from "../context/ThemeContext";
import { useWorkspaces } from "../context/WorkspaceContext";
import { useCommandShortcut } from "../hooks/useCommandShortcut";
import { useResource } from "../hooks/useResource";
import { channelService } from "../services";
import { sameId } from "../utils/format";

// La paleta no va en el primer paquete: se baja en un rato libre, o al acercarse al botón de buscar.
const loadCommandPalette = () => import("../components/CommandPalette");
const CommandPalette = lazy(loadCommandPalette);

const SIDEBAR_ID = "workspace-sidebar";

const WorkspaceScreen = () => {
  const { workspace_id: workspaceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, workspaces, status, error, reload } = useWorkspaces();
  const workspace = workspaces.find((item) => sameId(item.id, workspaceId));
  const channels = useResource(() => channelService.getByWorkspace(workspaceId), workspaceId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openModal, setOpenModal] = useState(null);
  // null: nunca se abrió (no se carga); "open" / "closed": ya se cargó.
  const [palette, setPalette] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const { setData: setChannels } = channels;

  // Descargas en segundo plano, fuera del camino crítico: así Ctrl+K y el selector de emojis
  // abren al instante la primera vez.
  useEffect(() => {
    const ids = [
      window.setTimeout(loadCommandPalette, 1500),
      window.setTimeout(() => import("../components/EmojiPicker"), 4000)
    ];

    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  const openPalette = useCallback(() => setPalette("open"), []);
  useCommandShortcut(() => setPalette((current) => (current === "open" ? "closed" : "open")));

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleChannelCreated = useCallback(
    (channel) => {
      setChannels((previous) => [...(previous ?? []), channel]);
      setOpenModal(null);
      toast.success(`Canal #${channel.name} creado.`);
      navigate(`/workspace/${workspaceId}/channel/${channel.id}`);
    },
    [setChannels, navigate, workspaceId]
  );

  if (status === "loading") {
    return (
      <div className="page page--center">
        <LoadingState>Cargando espacio de trabajo...</LoadingState>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page page--center">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="page page--center">
        <div className="panel panel--compact">
          <h1 className="panel__title">Espacio de trabajo no encontrado</h1>
          <p className="panel__subtitle">No existe o no sos miembro.</p>
          <Link to="/home" className="button button--primary">
            Volver a mis espacios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace">
      <header className="workspace__topbar">
        <button
          type="button"
          className="icon-button workspace__menu"
          aria-controls={SIDEBAR_ID}
          aria-expanded={isSidebarOpen}
          aria-label={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setIsSidebarOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
          </svg>
        </button>
        <Brand />
        <Link to={`/workspace/${workspace.id}`} className="workspace__name">
          <Avatar name={workspace.name} src={workspace.image_url} size="sm" shape="square" />
          <span>{workspace.name}</span>
        </Link>
        <button type="button" className="search-trigger" onClick={openPalette}
          onPointerEnter={loadCommandPalette}
          aria-label="Buscar canales y personas (Ctrl+K)"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"
            />
          </svg>
          <span className="search-trigger__text">Buscar</span>
          <kbd className="search-trigger__keys">Ctrl K</kbd>
        </button>
        <div className="workspace__topbar-actions">
          <button
            type="button"
            className="icon-button theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              {theme === "dark" ? (
                <path
                  fill="currentColor"
                  d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5h-1v3h2V2Zm0 17h-1v3h2v-3ZM2 11v2h3v-2H2Zm17 0v2h3v-2h-3ZM5.6 4.2 4.2 5.6l2.1 2.1 1.4-1.4-2.1-2.1Zm12.7 12.1-1.4 1.4 2.1 2.1 1.4-1.4-2.1-2.1ZM4.2 18.4l1.4 1.4 2.1-2.1-1.4-1.4-2.1 2.1ZM17.7 5.6l1.4-1.4-1.4-1.4-2.1 2.1 1.4 1.4 2.1-2.1Z"
                />
              ) : (
                <path fill="currentColor" d="M12.3 3a9 9 0 1 0 8.7 11.5A7 7 0 0 1 12.3 3Z" />
              )}
            </svg>
          </button>
          <Link to="/home" className="button button--ghost button--small workspace__home-link">
            Mis espacios
          </Link>
          <UserButton />
        </div>
      </header>

      <div className="workspace__body">
        <WorkspaceSidebar
          id={SIDEBAR_ID}
          workspace={workspace}
          channels={channels}
          currentUser={user}
          isOpen={isSidebarOpen}
          onCreateChannel={() => setOpenModal("channel")}
          onInvite={() => setOpenModal("invite")}
        />
        {isSidebarOpen && (
          <div className="workspace__scrim" aria-hidden="true" onClick={() => setIsSidebarOpen(false)} />
        )}
        <main className="workspace__main">
          <Outlet context={{ workspace, channels, user, openCreateChannel: () => setOpenModal("channel") }} />
        </main>
      </div>

      {openModal === "channel" && (
        <CreateChannelModal
          workspaceId={workspace.id}
          onCreated={handleChannelCreated}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "invite" && <InviteModal workspace={workspace} onClose={() => setOpenModal(null)} />}
      {palette && (
        <Suspense fallback={null}>
          <CommandPalette
            open={palette === "open"}
            onOpenChange={(isOpen) => setPalette(isOpen ? "open" : "closed")}
            workspace={workspace}
            channels={channels}
            currentUser={user}
            theme={theme}
            onCreateChannel={() => setOpenModal("channel")}
            onInvite={() => setOpenModal("invite")}
            onToggleTheme={toggleTheme}
          />
        </Suspense>
      )}
    </div>
  );
};

export default WorkspaceScreen;
