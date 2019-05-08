import {
  Namespace,
  Response,
  Router,
  Routes,
} from "vingle-corgi";

export function createResolver(routes: Routes) {
  return (
    method: string,
    path: string,
    queryStringParameters?: { [key: string]: string },
    headers: { [key: string]: string } = {},
    body?: string,
  ) => {
    return new Promise<Response>((resolve, reject) => {
      const router = new Router([
        new Namespace("", {
          children: routes,
          async exceptionHandler(e: Error) {
            reject(e);
          },
        }),
      ]);

      router.resolve({
        headers,
        httpMethod: method,
        path,
        queryStringParameters,
        body,
      }, { timeout: 1000 }).then(resolve).catch(reject);
    });
  };
}
