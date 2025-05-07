import express, { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import path from 'path';
import fs from 'fs';

const viteLogger = createLogger();

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
    },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  // handle ALL non-api requests with vite.  This is crucial
  // to let vite handle the front end.  Make sure this is LAST.
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith('/api/')) {
      return next(); // Pass API requests to Express routes
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function log(message: string) {
  console.log(message);
}

export function serveStatic(app: Express) {
  const publicDir = path.resolve(import.meta.dirname, "..", "dist", "public");
  app.use(express.static(publicDir));
}