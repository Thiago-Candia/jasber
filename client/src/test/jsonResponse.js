export const jsonResponse = (body, status = 200) =>
  Promise.resolve(
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
