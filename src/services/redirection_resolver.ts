import * as _ from "lodash";
import * as request from "request";
import * as URL from "url";
const linkify = require("linkify-it")(); // tslint:disable-line

function linkifyMatch(text: string) {
  const matchResult = linkify.match(text);
  if (matchResult == null) {
    return [];
  } else {
    return linkify.match(text) as Array<{
      schema: string
      index: number,
      lastIndex: number,
      raw: string,
      text: string,
      url: string,
    }>;
  }
}

export class RedirectionResolver {
  constructor(
    private timeout: number = 5000,
    // tslint:disable-next-line
    private userAgent: string = "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
  ) {}

  public async resolve(url: string) {
    const MAX_REDIRECTS = 10;
    let redirectCount = 0;

    const urls: string[] = [url];

    while (redirectCount < MAX_REDIRECTS) {
      try {
        const redirectionUrl = await this.getRedirectionUrl(_.last(urls)!);

        if (redirectionUrl) {
          urls.push(...linkifyMatch(redirectionUrl).map((l) => l.url));
        } else {
          break;
        }
        redirectCount++;
      } catch (e) {
        break;
      }
    }

    return _.uniq(urls);
  }

  private async getRedirectionUrl(url: string) {
    return new Promise((resolve, reject) => {
      const req = request({
        method: "GET",
        url,
        headers: {
          "User-Agent": this.userAgent,
        },
        followRedirect: false,
        timeout: this.timeout,
      }).on("error", (e) => {
        clearTimeout(timerId);
        req.removeAllListeners(); // clean up event listeners

        reject(e);
      }).on("response", (res) => { // we only need to read response headers
        clearTimeout(timerId);
        req.removeAllListeners(); // clean up event listeners
        req.abort(); // stop receiving response body

        if (res.statusCode! >= 300 && res.statusCode! < 400) {
          return resolve(URL.resolve(url, res.headers.location));
        }

        resolve();
      });

      const timerId = setTimeout(() => {
        req.abort();
        reject(new Error(`reached read timeout ${this.timeout}ms`));
      }, this.timeout);
    }) as Promise<string>;
  }
}
