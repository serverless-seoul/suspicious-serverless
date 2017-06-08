import {
  Route,
  RoutingContext,
  Routes,
  Parameter,
} from 'vingle-corgi';

import * as Joi from 'joi';
import RedirectionResolver from '../../services/redirection_resolver';

export const routes: Routes = [
  Route.GET(
    '/redirection-chain', 'List of redirection chain urls',
    {
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
