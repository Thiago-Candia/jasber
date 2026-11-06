import { Link } from "react-router-dom";
import Brand from "./Brand";
import UserButton from "./UserButton";

const AppHeader = ({ showCreate = true }) => (
  <header className="app-header">
    <div className="app-header__inner">
      <Brand />
      <div className="app-header__actions">
        {showCreate && (
          <Link to="/new-workspace" className="button button--primary button--small app-header__cta">
            Crear espacio de trabajo
          </Link>
        )}
        <UserButton />
      </div>
    </div>
  </header>
);

export default AppHeader;
