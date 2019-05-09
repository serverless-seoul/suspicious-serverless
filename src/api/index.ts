import { Namespace, Router, SwaggerRoute } from "vingle-corgi";

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

  new Namespace("", {
    children: routes,
    async exceptionHandler(e) {
      console.error(e.stack); // tslint:disable-line
    },
  }),
]);

export const handler = router.handler();
