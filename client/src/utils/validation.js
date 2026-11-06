const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const validateEmail = (email) => {
  if (!email.trim()) return "Ingresá tu email.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Ingresá un email válido.";
  return null;
};

export const validateRequired = (value, message) => (value.trim() ? null : message);

export const validateNewPassword = (password) => {
  if (!password) return "Ingresá una contraseña.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
};

export const validatePasswordConfirmation = (password, confirmation) =>
  password === confirmation ? null : "Las contraseñas no coinciden.";

export const validateImage = (file) => {
  if (!file) return null;
  if (!file.type.startsWith("image/")) return "El archivo tiene que ser una imagen.";
  if (file.size > MAX_IMAGE_BYTES) return "La imagen no puede pesar más de 5 MB.";
  return null;
};

export const collectErrors = (checks) =>
  Object.fromEntries(Object.entries(checks).filter(([, message]) => Boolean(message)));
