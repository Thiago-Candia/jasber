import { describe, expect, it } from "vitest";
import { reactionService } from "../services";
import { findFirstUnreadId, latestTimestamp, readLastSeen, writeLastSeen } from "./lastSeen";
import { hasReacted, toggleReaction } from "./reactions";

describe("toggleReaction", () => {
  it("crea la reacción si no existía", () => {
    expect(toggleReaction([], "👍", 1)).toEqual([{ emoji: "👍", userIds: [1] }]);
    expect(toggleReaction(undefined, "👍", 1)).toEqual([{ emoji: "👍", userIds: [1] }]);
  });

  it("suma a quien reacciona y conserva el orden", () => {
    const start = [
      { emoji: "👍", userIds: [1] },
      { emoji: "🎉", userIds: [3] }
    ];

    expect(toggleReaction(start, "👍", 2)).toEqual([
      { emoji: "👍", userIds: [1, 2] },
      { emoji: "🎉", userIds: [3] }
    ]);
  });

  it("quita la reacción propia y borra el emoji cuando nadie queda", () => {
    expect(toggleReaction([{ emoji: "👍", userIds: [1, 2] }], "👍", 2)).toEqual([{ emoji: "👍", userIds: [1] }]);
    expect(toggleReaction([{ emoji: "👍", userIds: [1] }], "👍", 1)).toEqual([]);
  });

  it("compara ids sin importar si son número o texto", () => {
    expect(hasReacted({ emoji: "👍", userIds: [1] }, "1")).toBe(true);
    expect(toggleReaction([{ emoji: "👍", userIds: [1] }], "👍", "1")).toEqual([]);
  });
});

describe("reactionService", () => {
  it("guarda y devuelve las reacciones por conversación", async () => {
    await reactionService.toggle("channel-1-1", 10, "🎉", 2);
    await reactionService.toggle("channel-1-1", 10, "🎉", 3);
    await reactionService.toggle("channel-1-2", 11, "👍", 2);

    expect(await reactionService.getByConversation("channel-1-1")).toEqual({
      10: [{ emoji: "🎉", userIds: [2, 3] }]
    });
    expect(await reactionService.getByConversation("channel-1-2")).toEqual({
      11: [{ emoji: "👍", userIds: [2] }]
    });
    expect(await reactionService.getByConversation("otra")).toEqual({});
  });

  it("limpia el mensaje cuando se quita la última reacción", async () => {
    await reactionService.toggle("c", 1, "👍", 1);
    await reactionService.toggle("c", 1, "👍", 1);

    expect(await reactionService.getByConversation("c")).toEqual({});
  });

  it("tolera datos corruptos en el almacenamiento", async () => {
    localStorage.setItem("reactions:v1", "{no es json");

    expect(await reactionService.getByConversation("c")).toEqual({});
  });
});

describe("última visita", () => {
  const msg = (id, iso, senderId = 1, extra = {}) => ({ id, created_at: iso, sender: { id: senderId }, ...extra });

  it("guarda y lee la marca por conversación", () => {
    writeLastSeen("channel-1-1", 1234);

    expect(readLastSeen("channel-1-1")).toBe(1234);
    expect(readLastSeen("channel-1-2")).toBeNull();
    expect(readLastSeen(undefined)).toBeNull();
  });

  it("latestTimestamp ignora los mensajes que todavía no se enviaron", () => {
    const messages = [
      msg(1, "2026-10-14T12:00:00Z"),
      msg("local", "2030-01-01T00:00:00Z", 2, { localStatus: "sending" })
    ];

    expect(latestTimestamp(messages)).toBe(Date.parse("2026-10-14T12:00:00Z"));
  });

  it("findFirstUnreadId devuelve el primer mensaje ajeno posterior a la marca", () => {
    const messages = [
      msg(1, "2026-10-14T12:00:00Z"),
      msg(2, "2026-10-14T12:10:00Z", 2),
      msg(3, "2026-10-14T12:11:00Z", 1)
    ];
    const seen = Date.parse("2026-10-14T12:05:00Z");

    expect(findFirstUnreadId(messages, seen, 2)).toBe(3);
    expect(findFirstUnreadId(messages, seen, 99)).toBe(2);
    expect(findFirstUnreadId(messages, null, 2)).toBeNull();
    expect(findFirstUnreadId(messages, Date.parse("2026-10-15T00:00:00Z"), 2)).toBeNull();
  });
});
