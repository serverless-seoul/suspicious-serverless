import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();

const { expect } = chai;

import { Namespace, Router } from "vingle-corgi";
import { routes } from "../routes";

describe("API Handler", () => {
  let router: Router;
  beforeEach(() => {
    router = new Router([
      new Namespace("", {
        children: routes,
      }),
    ]);
  });

  describe("GET /redirection-chain", () => {
    it("should return redirection urls", async () => {
      const res = await router.resolve({
        path: "/redirection-chain",
        queryStringParameters: {
          url: "http://bit.ly/2siha2e",
        },
        httpMethod: "GET",
      } as any);

      expect(res.statusCode).to.be.eq(200);
      expect(JSON.parse(res.body).data).to.be.deep.eq([
        "http://bit.ly/2siha2e",
        "https://www.vingle.net/",
      ]);
    });
  });

});
