import { Link } from "react-router-dom";

const Brand = ({ to = "/home" }) => (
  <Link to={to} className="brand" aria-label="Jasber, ir al inicio">
    <span className="brand__mark" aria-hidden="true">
      #
    </span>
    <span className="brand__name">Jasber</span>
  </Link>
);

export default Brand;
