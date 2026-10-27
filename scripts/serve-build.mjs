// Strict local Pages rehearsal: serve only dist at the repository subpath.
// No SPA fallback: broken routes or root-relative asset URLs must fail tests.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, resolve, sep } from "node:path";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const base = "/ciso-journey/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    if (pathname === base.slice(0, -1)) {
      response.writeHead(301, { Location: base }).end();
      return;
    }
    if (!pathname.startsWith(base)) throw new Error("Outside Pages subpath");
    const relative = pathname.slice(base.length) || "index.html";
    const file = resolve(root, relative);
    if (!file.startsWith(resolve(root) + sep))
      throw new Error("Outside build directory");
    const content = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
});
server.listen(4174, "127.0.0.1", () =>
  console.log(`Built Pages app: http://127.0.0.1:4174${base}`),
);
