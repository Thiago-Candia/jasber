import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import { EmptyState, ErrorState, LoadingState } from "../components/StatusView";
import { useWorkspaces } from "../context/WorkspaceContext";

const memberCount = (workspace) => {
  const count = workspace.members?.length ?? 0;
  return count === 1 ? "1 miembro" : `${count} miembros`;
};

const HomeScreen = () => {
  const { user, workspaces, status, error, reload } = useWorkspaces();

  return (
    <div className="page">
      <AppHeader />
      <main className="page__main home">
        <p className="home__greeting">{user ? `¡Hola de nuevo, ${user.name}!` : "¡Hola de nuevo!"}</p>

        <section className="panel" aria-labelledby="workspaces-title">
          <h1 id="workspaces-title" className="panel__title">
            Tus espacios de trabajo
          </h1>
          {user && <p className="panel__subtitle">Espacios de trabajo para {user.email}</p>}

          {status === "loading" && <LoadingState>Cargando espacios de trabajo...</LoadingState>}
          {status === "error" && <ErrorState error={error} onRetry={reload} />}
          {status === "ready" && workspaces.length === 0 && (
            <EmptyState title="Todavía no pertenecés a ningún espacio de trabajo.">
              <p>Creá uno nuevo o pedile a alguien de tu equipo un link de invitación.</p>
            </EmptyState>
          )}
          {status === "ready" && workspaces.length > 0 && (
            <ul className="workspace-cards">
              {workspaces.map((workspace) => (
                <li key={workspace.id} className="workspace-card">
                  <Avatar name={workspace.name} src={workspace.image_url} size="lg" shape="square" />
                  <div className="workspace-card__info">
                    <h2 className="workspace-card__name">{workspace.name}</h2>
                    <p className="workspace-card__meta">{memberCount(workspace)}</p>
                  </div>
                  <Link
                    to={`/workspace/${workspace.id}`}
                    className="button button--primary"
                    aria-label={`Abrir ${workspace.name}`}
                  >
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel panel--row" aria-labelledby="create-title">
          <div className="panel__art" aria-hidden="true">
            #
          </div>
          <h2 id="create-title" className="panel__lead">
            ¿Querés usar Jasber con otro equipo?
          </h2>
          <Link to="/new-workspace" className="button button--primary">
            Crear un espacio de trabajo
          </Link>
        </section>

        <p className="home__hint">
          ¿No encontrás tu espacio de trabajo? Pedile a alguien del equipo un link de invitación.
        </p>
      </main>
    </div>
  );
};

export default HomeScreen;
