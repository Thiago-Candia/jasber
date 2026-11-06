import ENVIRONMENT from "../config/environment";

export const assetUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;

  return `${ENVIRONMENT.API_URL}${path}`;
};
