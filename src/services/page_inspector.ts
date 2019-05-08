import * as BbPromise from "bluebird";
import * as debug from "debug";
import * as puppeteer from "puppeteer";
import * as request from "request";

import launchChrome, { LaunchedChrome } from "./serverless-chrome";

export interface Content {
  navigatedUrls: string[];
  html: string;
}

export class PageInspector {
  private readonly LOG_TAG = "suspicious-serverless:page-inspector";
  // @note starting puppeteer v0.12.0, timeout can be disabled if timeout is zero (0).
  private readonly NAVIGATION_TIMEOUT = 30 * 1000; // in milliseconds

  // tslint:disable-next-line
  private readonly DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36";
  private readonly DEFAULT_PLATFORM = "Win32";

  private browser: puppeteer.Browser | null = null;
  private slsChrome: LaunchedChrome | null = null;

  private log = debug(this.LOG_TAG);

  constructor(
    private disableServerlessChrome = false,
  ) {}

  public async inspect(url: string, wait: number = 0): Promise<Content> {
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

    // setup request interceptor
    await page.setRequestInterception(true);
    page.on("request", async (interceptedRequest) => {
      const resourceType = interceptedRequest.resourceType();

      switch (resourceType) {
        case "image":
        case "media":
        case "font": {
          interceptedRequest.abort();
          break;
        }
        default: {
          interceptedRequest.continue();
          break;
        }
      }
    });

    // setup environment
    await page.evaluateOnNewDocument((platform) => {
      // this function will be evaluated in browser context
      Object.defineProperties(navigator, {
        // overwrite the `platform` property to use a custom getter
        platform: {
          get() {
            return platform;
          },
        },
      });
    }, this.DEFAULT_PLATFORM);

    page.on("framenavigated", (frame: puppeteer.Frame) => {
      if (frame === mainFrame) {
        const navigatedUrl = frame.url();

        this.log("navigated to ", navigatedUrl);

        lastNavigatedAt = Date.now();
        navigatedUrls.push(navigatedUrl);
      }
    });

    page.on("dialog", async (dialog) => {
      this.log("got dialog (type: %s, message: %s)", dialog.type, dialog.message());
      await dialog.dismiss();
    });

    this.log("navigating to ", url);

    try {
      await page.goto(url, { timeout: this.NAVIGATION_TIMEOUT });
    } catch (e) {
      return {
        navigatedUrls,
        html: "",
      };
    }

    // by default, puppeteer waits for load event.
    this.log("got loaded event from", url);
    lastNavigatedAt = Date.now();

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
        }, 100);
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
        this.slsChrome = null;
      }
    }

    const ADDITIONAL_CHROME_FLAGS = [
      `--user-agent="${this.DEFAULT_USER_AGENT}"`,
    ];

    if (this.disableServerlessChrome) { // local or test environment
      this.log("DISABLE_SERVERLESS_CHROME is set, launching bundled chrome!");
      this.browser = await puppeteer.launch({
        args: ADDITIONAL_CHROME_FLAGS,
      });
    } else { // in lambda runtime
      this.log("launching serverless-chrome instance");
      const chrome = await launchChrome({
        flags: ADDITIONAL_CHROME_FLAGS,
      });
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
