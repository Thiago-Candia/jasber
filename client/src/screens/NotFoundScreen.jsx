import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

const NotFoundScreen = () => (
  <AuthLayout title="Página no encontrada" subtitle="La dirección que abriste no existe.">
    <Link to="/home" className="button button--primary button--block">
      Ir al inicio
    </Link>
  </AuthLayout>
);

export default NotFoundScreen
