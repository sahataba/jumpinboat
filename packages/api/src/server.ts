import http from "node:http";

import { searchPublicBoatListings, parsePublicBoatListFilters } from "./public-boats.js";

const port = Number(process.env.PORT) || 4000;

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "GET" && requestUrl.pathname === "/api/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("ok");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/boats/search") {
    const filters = parsePublicBoatListFilters(requestUrl);
    const payload = {
      items: searchPublicBoatListings(filters),
    };

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not Found");
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${port}`);
});
