import {
  Parameter,
  Route,
  Routes,
  RoutingContext,
} from "vingle-corgi";

import * as Joi from "joi";
import { ContentDispatcher } from "../../services/content_dispatcher";
import { RedirectionResolver } from "../../services/redirection_resolver";

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
      desc: "Dispatch content of given url",
      operationId: "dispatchContent",
    }, {
      url: Parameter.Query(Joi.string().required()),
    }, async function(this: RoutingContext) {
      const url = this.params.url as string;

      // We can't re-use chrome instance now because currently serverless-chrome is not stable.
      // launching new chrome process will cause additional processing time (approx. 600ms)
      const dispatcher = new ContentDispatcher(!!process.env.DISABLE_SERVERLESS_CHROME);

      await dispatcher.launch();

      const content = await dispatcher.dispatch(url, 3000);

      await dispatcher.shutdown();

      return this.json({
        data: content,
      });
    },
  )
];
