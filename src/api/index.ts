import { Router, Namespace, SwaggerRoute } from 'vingle-corgi';
import * as Joi from 'joi';

import { routes } from './routes';
const router = new Router([
  new SwaggerRoute(
    '/swagger',
    {
      info: {
        title: "Vingle suspicious content analysis API",
        version: "1.0.0",
      },
      host: "www.vingle.net",
      basePath: "/",
    },
    routes
  ),

  new Namespace('', {
    exceptionHandler: async function(error: any) {
      if (error.name == 'ValidationError') {
        const validationError = error as Joi.ValidationError;
        return this.json(
          {
            errors: validationError.details.map(e => e.message),
          },
          422
        );
      }
    },
    children: routes,
  }),
]);


export const handler = router.handler();
