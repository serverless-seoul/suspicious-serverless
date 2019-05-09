import { expect } from "chai";

import { sandbox } from "../../__test__/helper";
import { createResolver } from "./helper";

import { PageInspector } from "../../services/page_inspector";
import { RedirectionResolver } from "../../services/redirection_resolver";

import { routes } from "../routes";

describe("API Handler", () => {
  const resolve = createResolver(routes);

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
      const res = await resolve("GET", "/redirection-chain", {
        url: "http://bit.ly/2siha2e",
      });

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
      sandbox.stub(PageInspector.prototype, "launch")
        .resolves();

      sandbox.stub(PageInspector.prototype, "inspect")
        .withArgs(MOCK_URL, 3000)
        .resolves(MOCK_CONTENT);

      sandbox.stub(PageInspector.prototype, "shutdown")
        .resolves();
    });

    it("should inspected page content of given url", async () => {
      const res = await resolve("GET", "/content", {
        url: MOCK_URL,
      });

      expect(res.statusCode).to.be.eq(200);
      expect(JSON.parse(res.body).data).to.be.deep.eq(MOCK_CONTENT);
    });
  });
});
