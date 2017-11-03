import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as nock from "nock";
import * as sinon from "sinon";
chai.use(chaiAsPromised);
const expect = chai.expect;

import * as puppeteer from "puppeteer";
import * as qs from "qs";
import { server as mockServer } from "./mock_server";

import { ContentDispatcher } from "../content_dispatcher";
import * as serverlessChrome from "../serverless_chrome";

const MOCK_SERVER_PORT = 3001;
const MOCK_SERVER_BASE_URL = `http://127.0.0.1:${MOCK_SERVER_PORT}`;

describe("ContentDispatcher", () => {
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

  describe("#launch", () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
      sandbox.restore();
    });

    context("when browser already exists", () => {
      let dispatcher: ContentDispatcher;

      let puppeteerLaunchStub: sinon.SinonStub;
      let dispatcherShutdownStub: sinon.SinonStub;

      beforeEach(async () => {
        dispatcher = new ContentDispatcher(true);

        puppeteerLaunchStub = sandbox.stub(puppeteer, "launch").resolves({});
        dispatcherShutdownStub = sandbox.stub(dispatcher, "shutdown").resolves();

        await dispatcher.launch();
      });

      it("should re-use chrome instance if available", async () => {
        sandbox.stub((dispatcher as any), "browser").value({
          version: sandbox.stub().resolves("Chrome/12.34.56"),
        });

        await dispatcher.launch();

        expect(puppeteerLaunchStub.callCount).to.be.eq(1);
      });

      it("should shutdown previous chrome instance if not available", async () => {
        sandbox.stub((dispatcher as any), "browser").value({
          version: sandbox.stub().rejects(new Error("foo")),
          close: sandbox.stub().resolves(),
        });

        await dispatcher.launch();

        expect(puppeteerLaunchStub.callCount).to.be.eq(2);
        expect(dispatcherShutdownStub.callCount).to.be.eq(1);
      });
    });

    context("when serverless-chrome disabled", () => {
      let dispatcher: ContentDispatcher;
      let puppeteerLaunchStub: sinon.SinonStub;

      beforeEach(async () => {
        dispatcher = new ContentDispatcher(true);
        puppeteerLaunchStub = sandbox.stub(puppeteer, "launch").resolves({});
      });

      it("should launch puppeteer bundled chromium instance", async () => {
        await dispatcher.launch();
        expect(puppeteerLaunchStub.called).to.be.eq(true);
      });
    });

    context("when serverless-chrome enabled", () => {
      let dispatcher: ContentDispatcher;
      let launchChromeStub: sinon.SinonStub;
      let getDebuggerUrlStub: sinon.SinonStub;
      let puppeteerConnectStub: sinon.SinonStub;

      const MOCK_DEBUGGER_BASE_URL = "http://127.0.0.1:54321";
      const MOCK_DEBUGGER_WS_ENDPOINT = "ws://127.0.0.1:54321/devtools/browser/12345678";

      beforeEach(async () => {
        dispatcher = new ContentDispatcher();

        launchChromeStub = sandbox.stub(serverlessChrome, "launchChrome").resolves({
          url: MOCK_DEBUGGER_BASE_URL,
        });
        getDebuggerUrlStub = sandbox.stub(dispatcher as any, "getDebuggerUrl").resolves(MOCK_DEBUGGER_WS_ENDPOINT);
        puppeteerConnectStub = sandbox.stub(puppeteer, "connect").resolves({});
      });

      it("should launch puppeteer bundled chromium instance", async () => {
        await dispatcher.launch();
        expect(launchChromeStub.called).to.be.eq(true);
        expect(getDebuggerUrlStub.called).to.be.eq(true);
        expect(puppeteerConnectStub.calledWith({
          browserWSEndpoint: MOCK_DEBUGGER_WS_ENDPOINT,
        }));
      });
    });
  });

  describe("#dispatch", () => {
    let dispatcher: ContentDispatcher;

    beforeEach(() => {
      dispatcher = new ContentDispatcher(true);
    });

    context("when dispatcher hasn't been launched", () => {
      it("should throw error if dispatcher has not been launched", async () => {
        await expect(dispatcher.dispatch(`${MOCK_SERVER_BASE_URL}/redirection/http`)).to.be.rejectedWith(Error);
      });
    });
    context("when dispatcher has been launched", () => {
      beforeEach(async () => {
        await dispatcher.launch();
      });

      afterEach(async () => {
        await dispatcher.shutdown();
      });

      it("should return dispatched content", async () => {
        const content = await dispatcher.dispatch(`${MOCK_SERVER_BASE_URL}/redirection/http`);

        expect(content).to.be.deep.eq({
          navigatedUrls: [`${MOCK_SERVER_BASE_URL}/?${qs.stringify({ from: "/redirection/http" })}`],
          // tslint:disable-next-line
          html: "<!DOCTYPE html><html lang=\"en\"><head>\n  <meta charset=\"UTF-8\">\n  <title>Hello</title>\n</head>\n<body>\n  <p>HOLA</p>\n\n</body></html>",
        });
      });

      it("should wait specified delay and return dispatched content", async () => {
        const content = await dispatcher.dispatch(`${MOCK_SERVER_BASE_URL}/redirection/js`, 2000);

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
    let dispatcher: ContentDispatcher;
    let closeStub: sinon.SinonStub;

    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
      dispatcher = new ContentDispatcher();

      closeStub = sandbox.stub().resolves();
      sandbox.stub((dispatcher as any), "browser").value({
        close: closeStub,
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should shutdown puppeteer instance", async () => {
      await dispatcher.shutdown();

      expect(closeStub.calledOnce).to.be.eq(true);
    });

    context("when serverless-chrome enabled", () => {
      let killStub: sinon.SinonStub;

      beforeEach(() => {
        killStub = sandbox.stub().resolves();

        sandbox.stub((dispatcher as any), "slsChrome").value({
          kill: killStub,
        });
      });

      it("should kill chrome process also", async () => {
        await dispatcher.shutdown();

        expect(killStub.called).to.be.eq(true);
      });
    });
  });

  describe("#getDebuggerUrl", async () => {
    let dispatcher: ContentDispatcher;

    const MOCK_DEBUGGER_HOST = "127.0.0.1";
    const MOCK_DEBUGGER_PORT = 1234;
    const MOCK_DEBUGGER_BASE_URL = `http://${MOCK_DEBUGGER_HOST}:${MOCK_DEBUGGER_PORT}`;
    const MOCK_DEBUGGER_WS_ENDPOINT = `ws://${MOCK_DEBUGGER_HOST}:${MOCK_DEBUGGER_PORT}/devtools/browser/12345678-1234`;

    beforeEach(() => {
      dispatcher = new ContentDispatcher();

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
      const debuggerUrl = await (dispatcher as any).getDebuggerUrl(MOCK_DEBUGGER_BASE_URL);

      expect(debuggerUrl).to.be.eq(MOCK_DEBUGGER_WS_ENDPOINT);
    });
  });
});
