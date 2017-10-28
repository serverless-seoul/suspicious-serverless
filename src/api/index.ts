import { Router, SwaggerRoute } from "vingle-corgi";

import { routes } from "./routes";
const router = new Router([
  new SwaggerRoute(
    "/swagger",
    {
      title: "Vingle suspicious content analysis API",
      version: "1.0.0",
    },
    routes,
  ),
]);

export const handler = router.handler();
