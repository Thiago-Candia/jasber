const LABELS = {
  online: "En línea",
  away: "Ausente",
  offline: "Desconectado"
};

// Punto de presencia. Si `status` no es uno conocido no dibuja nada, así se puede dejar
// puesto en la interfaz hasta que la API informe quién está conectado.
const PresenceDot = ({ status, decorative = false }) => {
  if (!LABELS[status]) return null;

  return (
    <span
      className={`presence presence--${status}`}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : LABELS[status]}
      aria-hidden={decorative || undefined}
    />
  );
};

export default PresenceDot;
