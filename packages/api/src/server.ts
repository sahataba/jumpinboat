import { createServer } from "node:http";

import * as HttpServer from "@effect/platform/HttpServer";
import * as HttpMiddleware from "@effect/platform/HttpMiddleware";
import { NodeContext, NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";

import { app } from "./http/router.js";
import { AuthServiceLive } from "./services/auth-service.js";
import { PublicBoatsService } from "./services/public-boats-service.js";

const port = Number(process.env.PORT) || 4000;

const ApiLive = HttpServer.serve(app, HttpMiddleware.logger).pipe(
  Layer.provide(AuthServiceLive),
  Layer.provide(PublicBoatsService.Live),
  Layer.provide(NodeContext.layer),
  Layer.provide(NodeHttpServer.layer(createServer, { port })),
);

NodeRuntime.runMain(Layer.launch(ApiLive));
