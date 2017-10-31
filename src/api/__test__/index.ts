import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
chai.use(chaiAsPromised);
chai.should();

const { expect } = chai;

import { Namespace, Router } from "vingle-corgi";
import { routes } from "../routes";

import { RedirectionResolver } from "../../services/redirection_resolver";

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
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
      sandbox.stub(RedirectionResolver.prototype, "resolve")
        .withArgs("http://bit.ly/2siha2e")
        .returns([
          "http://bit.ly/2siha2e",
          "https://www.vingle.net/",
        ]);
    });

    afterEach(() => {
      sandbox.restore();
    });

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
