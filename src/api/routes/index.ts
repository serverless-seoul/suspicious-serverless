import {
  Parameter,
  Route,
  Routes,
  RoutingContext,
} from "vingle-corgi";

import * as Joi from "joi";
import RedirectionResolver from "../../services/redirection_resolver";

export const routes: Routes = [
  Route.GET(
    "/redirection-chain", {
      desc: "List of redirection chain urls",
      operationId: "getRedirectionChain",
    }, {
      url: Parameter.Query(Joi.string()),
    },
    async function(this: RoutingContext) {
      const url = this.params.url as string;

      const resolver = new RedirectionResolver();

      return this.json({
        data: await resolver.resolve(url),
      });
    }),
];
