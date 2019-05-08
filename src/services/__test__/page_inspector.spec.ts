import { expect } from "chai";
import * as nock from "nock";

import * as puppeteer from "puppeteer";
import * as qs from "qs";
import { sandbox } from "../../__test__/helper";
import { server as mockServer } from "./mock_server";

import { PageInspector } from "../page_inspector";
import * as serverlessChrome from "../serverless-chrome";

const MOCK_SERVER_PORT = 3001;
const MOCK_SERVER_BASE_URL = `http://127.0.0.1:${MOCK_SERVER_PORT}`;

describe(PageInspector.name, () => {
  let inspector: PageInspector;

  before(async () => {
    await new Promise((resolve) => {
      mockServer.listen(MOCK_SERVER_PORT, resolve);
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      mockServer.close(resolve);
    });
  });

  beforeEach(async () => {
    inspector = new PageInspector(true);
  });

  describe("#launch", () => {
    context("when browser already exists", () => {
      let puppeteerLaunchStub: sinon.SinonStub;
      let inspectorShutdownStub: sinon.SinonStub;

      beforeEach(async () => {
        puppeteerLaunchStub = sandbox.stub(puppeteer, "launch");
        inspectorShutdownStub = sandbox.stub(inspector, "shutdown").resolves();

        await inspector.launch();
      });

      it("should re-use chrome instance if available", async () => {
        sandbox.stub((inspector as any), "browser").value({
          version: sandbox.stub().resolves("Chrome/12.34.56"),
        });

        await inspector.launch();

        expect(puppeteerLaunchStub.callCount).to.be.eq(1);
      });

      it("should shutdown previous chrome instance if not available", async () => {
        sandbox.stub((inspector as any), "browser").value({
          version: sandbox.stub().rejects(new Error("foo")),
          close: sandbox.stub().resolves(),
        });

        await inspector.launch();

        expect(puppeteerLaunchStub.callCount).to.be.eq(2);
        expect(inspectorShutdownStub.callCount).to.be.eq(1);
      });
    });

    context("when serverless-chrome disabled", () => {
      let puppeteerLaunchStub: sinon.SinonStub;

      beforeEach(async () => {
        puppeteerLaunchStub = sandbox.stub(puppeteer, "launch").resolves();
      });

      it("should launch puppeteer bundled chromium instance", async () => {
        await inspector.launch();
        expect(puppeteerLaunchStub.called).to.be.eq(true);
      });
    });

    context("when serverless-chrome enabled", () => {
      let launchChromeStub: sinon.SinonStub;
      let getDebuggerUrlStub: sinon.SinonStub;
      let puppeteerConnectStub: sinon.SinonStub;

      const MOCK_DEBUGGER_BASE_URL = "http://127.0.0.1:54321";
      const MOCK_DEBUGGER_WS_ENDPOINT = "ws://127.0.0.1:54321/devtools/browser/12345678";

      beforeEach(async () => {
        inspector = new PageInspector();
        launchChromeStub = sandbox.stub(serverlessChrome, "default")
          .resolves({ url: MOCK_DEBUGGER_BASE_URL } as any);
        getDebuggerUrlStub = sandbox.stub(inspector as any, "getDebuggerUrl")
          .resolves(MOCK_DEBUGGER_WS_ENDPOINT as any);
        puppeteerConnectStub = sandbox.stub(puppeteer, "connect");
      });

      it("should launch puppeteer bundled chromium instance", async () => {
        await inspector.launch();
        expect(launchChromeStub.called).to.be.eq(true);
        expect(getDebuggerUrlStub.called).to.be.eq(true);
        expect(puppeteerConnectStub.calledWith({
          browserWSEndpoint: MOCK_DEBUGGER_WS_ENDPOINT,
        }));
      });
    });
  });

  describe("#inspect", () => {
    context("when inspector hasn't been launched", () => {
      it("should throw error if inspectorer has not been launched", async () => {
        let caught: Error | undefined;

        try {
          await inspector.inspect(`${MOCK_SERVER_BASE_URL}/redirection/http`);
        } catch (e) {
          caught = e;
        }

        expect(caught).to.be.instanceOf(Error);
      });
    });
    context("when inspector has been launched", () => {
      beforeEach(async () => {
        await inspector.launch();
      });

      afterEach(async () => {
        await inspector.shutdown();
      });

      it("should return inspected page", async () => {
        const content = await inspector.inspect(`${MOCK_SERVER_BASE_URL}/redirection/http`);

        expect(content).to.be.deep.eq({
          navigatedUrls: [`${MOCK_SERVER_BASE_URL}/?${qs.stringify({ from: "/redirection/http" })}`],
          // tslint:disable-next-line
          html: "<!DOCTYPE html><html lang=\"en\"><head>\n  <meta charset=\"UTF-8\">\n  <title>Hello</title>\n</head>\n<body>\n  <p>HOLA</p>\n\n</body></html>",
        });
      });

      it("should wait specified delay and return inspected page", async () => {
        const content = await inspector.inspect(`${MOCK_SERVER_BASE_URL}/redirection/js`, 2000);

        expect(content).to.be.deep.eq({
          navigatedUrls: [
            `${MOCK_SERVER_BASE_URL}/redirection/js`,
            `${MOCK_SERVER_BASE_URL}/?${qs.stringify({ from: "/redirection/js" })}`,
          ],
          // tslint:disable-next-line
          html: "<!DOCTYPE html><html lang=\"en\"><head>\n  <meta charset=\"UTF-8\">\n  <title>Hello</title>\n</head>\n<body>\n  <p>HOLA</p>\n\n</body></html>",
        });
      });
    });
  });

  describe("#shutdown", () => {
    let closeStub: sinon.SinonStub;

    beforeEach(() => {
      inspector = new PageInspector();

      closeStub = sandbox.stub().resolves();
      sandbox.stub((inspector as any), "browser").value({
        close: closeStub,
      });
    });

    it("should shutdown puppeteer instance", async () => {
      await inspector.shutdown();

      expect(closeStub.calledOnce).to.be.eq(true);
    });

    context("when serverless-chrome enabled", () => {
      let killStub: sinon.SinonStub;

      beforeEach(() => {
        killStub = sandbox.stub().resolves();

        sandbox.stub((inspector as any), "slsChrome").value({
          kill: killStub,
        });
      });

      it("should kill chrome process also", async () => {
        await inspector.shutdown();

        expect(killStub.called).to.be.eq(true);
      });
    });
  });

  describe("#getDebuggerUrl", async () => {
    const MOCK_DEBUGGER_HOST = "127.0.0.1";
    const MOCK_DEBUGGER_PORT = 1234;
    const MOCK_DEBUGGER_BASE_URL = `http://${MOCK_DEBUGGER_HOST}:${MOCK_DEBUGGER_PORT}`;
    const MOCK_DEBUGGER_WS_ENDPOINT = `ws://${MOCK_DEBUGGER_HOST}:${MOCK_DEBUGGER_PORT}/devtools/browser/12345678-1234`;

    beforeEach(() => {
      inspector = new PageInspector();

      nock(MOCK_DEBUGGER_BASE_URL)
        .get("/json/version")
        .reply(200, {
          webSocketDebuggerUrl: MOCK_DEBUGGER_WS_ENDPOINT,
        });
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it("should return debugger url", async () => {
      const debuggerUrl = await (inspector as any).getDebuggerUrl(MOCK_DEBUGGER_BASE_URL);

      expect(debuggerUrl).to.be.eq(MOCK_DEBUGGER_WS_ENDPOINT);
    });
  });
});
