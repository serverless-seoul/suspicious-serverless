import {
  Parameter,
  Route,
  Routes,
  RoutingContext,
} from "vingle-corgi";

import * as Joi from "joi";

import { PageInspector } from "../../services/page_inspector";
import { RedirectionResolver } from "../../services/redirection_resolver";

const inspector = new PageInspector(!!process.env.DISABLE_SERVERLESS_CHROME);

export const routes: Routes = [
  Route.GET(
    "/redirection-chain", {
      desc: "List of redirection chain urls",
      operationId: "getRedirectionChain",
    }, {
      url: Parameter.Query(Joi.string().required()),
    }, async function(this: RoutingContext) {
      const url = this.params.url as string;

      const resolver = new RedirectionResolver();

      return this.json({
        data: await resolver.resolve(url),
      });
    },
  ),
  Route.GET(
    "/content", {
      desc: "Fetch content of given url",
      operationId: "getContent",
    }, {
      url: Parameter.Query(Joi.string().required()),
    }, async function(this: RoutingContext) {
      const url = this.params.url as string;

      await inspector.launch();
      const content = await inspector.inspect(url, 3000);
      // await inspector.shutdown();

      return this.json({
        data: content,
      });
    },
  ),
];
