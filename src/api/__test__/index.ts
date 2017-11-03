import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
chai.use(chaiAsPromised);
chai.should();

const { expect } = chai;

import { Namespace, Router } from "vingle-corgi";
import { routes } from "../routes";

import { ContentDispatcher } from "../../services/content_dispatcher";
import { RedirectionResolver } from "../../services/redirection_resolver";

describe("API Handler", () => {
  let router: Router;
  const sandbox = sinon.sandbox.create();

  beforeEach(() => {
    router = new Router([
      new Namespace("", {
        children: routes,
      }),
    ]);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("GET /redirection-chain", () => {
    beforeEach(() => {
      sandbox.stub(RedirectionResolver.prototype, "resolve")
        .withArgs("http://bit.ly/2siha2e")
        .resolves([
          "http://bit.ly/2siha2e",
          "https://www.vingle.net/",
        ]);
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

  describe("GET /content", () => {
    const MOCK_URL = "https://www.vingle.net";
    const MOCK_CONTENT = {
      navigatedUrls: [
        MOCK_URL,
      ],
      html: "Vingle, Very Community",
    };

    beforeEach(() => {
      sandbox.stub(ContentDispatcher.prototype, "launch")
        .resolves();

      sandbox.stub(ContentDispatcher.prototype, "dispatch")
        .withArgs(MOCK_URL, 3000)
        .resolves(MOCK_CONTENT);

      sandbox.stub(ContentDispatcher.prototype, "shutdown")
        .resolves();
    });

    it("should dispatch content of given url", async () => {
      const res = await router.resolve({
        path: "/content",
        queryStringParameters: {
          url: MOCK_URL,
        },
        httpMethod: "GET",
      } as any);

      expect(res.statusCode).to.be.eq(200);
      expect(JSON.parse(res.body).data).to.be.deep.eq(MOCK_CONTENT);
    });
  });
});
