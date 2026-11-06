// Reacciones de un mensaje: [{ emoji, userIds: [...] }], en el orden en que se crearon.

export const toggleReaction = (reactions = [], emoji, userId) => {
  const current = reactions.find((item) => item.emoji === emoji);

  if (!current) return [...reactions, { emoji, userIds: [userId] }];

  const hasReacted = current.userIds.some((id) => String(id) === String(userId));
  const userIds = hasReacted
    ? current.userIds.filter((id) => String(id) !== String(userId))
    : [...current.userIds, userId];

  if (userIds.length === 0) return reactions.filter((item) => item.emoji !== emoji);

  return reactions.map((item) => (item.emoji === emoji ? { ...item, userIds } : item));
};

export const hasReacted = (reaction, userId) => reaction.userIds.some((id) => String(id) === String(userId));
