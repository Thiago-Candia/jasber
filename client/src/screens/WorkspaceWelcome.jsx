import { Link, useOutletContext } from "react-router-dom";

const WorkspaceWelcome = () => {
  const { workspace, channels, openCreateChannel } = useOutletContext();
  const firstChannel = channels.status === "ready" ? channels.data[0] : null;

  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <h1 id="welcome-title" className="welcome__title">
        Te damos la bienvenida a {workspace.name}
      </h1>
      <p className="welcome__text">Elegí un canal o una persona en la barra lateral para empezar a conversar.</p>
      <div className="welcome__actions">
        {firstChannel && (
          <Link to={`channel/${firstChannel.id}`} className="button button--primary">
            Ir a #{firstChannel.name}
          </Link>
        )}
        <button type="button" className="button button--secondary" onClick={openCreateChannel}>
          Crear un canal
        </button>
      </div>
    </section>
  );
};

export default WorkspaceWelcome;
