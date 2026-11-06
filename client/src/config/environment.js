const API_URL = (import.meta.env.VITE_URL_API || "http://localhost:3000").replace(/\/+$/, "");

const ENVIRONMENT = {
  API_URL
};

export default ENVIRONMENT;
