const timeFormatter = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

export const formatMessageTime = (isoDate) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const isToday = date.toDateString() === new Date().toDateString();
  const time = timeFormatter.format(date);

  return isToday ? time : `${dateFormatter.format(date)}, ${time}`;
};

export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

export const sameId = (id, param) => String(id) === String(param);
