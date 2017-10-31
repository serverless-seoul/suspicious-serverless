import * as BbPromise from "bluebird";
import * as debug from "debug";
import * as puppeteer from "puppeteer";
import * as request from "request";

import { launchChrome } from "./serverless_chrome";

export interface Content {
  navigatedUrls: string[];
  html: string;
}

export class ContentDispatcher {
  private LOG_TAG = "suspicious-serverless:content-dispatcher";
  private browser: puppeteer.Browser | null = null;
  private slsChrome: {
    kill: () => Promise<void>;
  } | null = null;

  private log = debug(this.LOG_TAG);

  constructor(
    private disableServerlessChrome = false,
  ) {}

  public async dispatch(url: string, wait: number = 0): Promise<Content> {
    if (!this.browser) {
      throw new Error("browser not found");
    }

    let lastNavigatedAt = Date.now();
    const navigatedUrls: string[] = [];

    this.log("creating page");
    const page = await this.browser.newPage();
    this.log("getting main frame");
    const mainFrame = page.mainFrame();

    this.log("created new page");

    page.on("framenavigated", (frame: puppeteer.Frame) => {
      if (frame === mainFrame) {
        const navigatedUrl = frame.url();

        this.log("navigated to ", navigatedUrl);

        lastNavigatedAt = Date.now();
        navigatedUrls.push(navigatedUrl);
      }
    });
    // await page.goto('https://t.co/9XYeM5h7a5');
    // await page.goto('https://anonym.to/?http://www.naver.com');
    this.log("navigating to ", url);

    await page.goto(url);

    // by default, puppeteer waits for load event.
    this.log("got loaded event from", url);

    // this logic waits additional time after last document requested (if specified),
    // to detect javascript-based navigation requests
    if (wait) {
      await new BbPromise((resolve) => {
        const tid = setInterval(() => {
          const elapsed = Date.now() - lastNavigatedAt;
          this.log("elapsed: %dms", elapsed);

          if (elapsed > wait) {
            clearInterval(tid);
            resolve();
          }
        }, 1000);
      });
    }

    const html = await page.content();
    this.log("got page html");

    await page.close();
    this.log("closed page");

    return {
      navigatedUrls,
      html,
    };
  }

  public async shutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;

      if (!this.disableServerlessChrome && this.slsChrome) {
        await this.slsChrome.kill();
      }
    }
  }

  public async launch() {
    if (this.browser) {
      this.log("running chrome instance detected, checking availability...");

      try {
        const version = await this.browser.version();
        this.log("received chrome version %s response", version);
        return;
      } catch (e) {
        this.log("failed to receive response from instance: ", e.stack);
        this.log("re-launching...");
        await this.shutdown();
      }
    }

    if (this.disableServerlessChrome) { // local or test environment
      this.log("DISABLE_SERVERLESS_CHROME is set, launching bundled chrome!");
      this.browser = await puppeteer.launch();
    } else { // in lambda runtime
      this.log("launching serverless-chrome instance");
      const chrome = await launchChrome();
      this.log("chrome: ", chrome);

      this.log("getting debugger url from %s", chrome.url);

      const debuggerUrl = await this.getDebuggerUrl(chrome.url);

      this.log("got debugger url: ", debuggerUrl);
      this.browser = await puppeteer.connect({
        browserWSEndpoint: debuggerUrl,
      });
      this.slsChrome = chrome;
    }

    this.log("successfully connected");
  }

  private getDebuggerUrl(baseUrl: string): BbPromise<string> {
    return new BbPromise((resolve, reject) => {
      request({
        method: "GET",
        url: `${baseUrl}/json/version`,
        json: true,
        timeout: 5000,
      }, (e, res, body) => {
        if (e) {
          return reject(e);
        }

        const debuggerUrl = body.webSocketDebuggerUrl;

        if (!debuggerUrl) {
          return reject(new Error("Couldn't find debugger url from response"));
        }

        resolve(debuggerUrl as string);
      });
    });
  }
}
