import * as debug from "debug";
import * as Linkify from "linkify-it";
import * as _ from "lodash";
import * as request from "request";
import * as URL from "url";

const linkify = Linkify();

export class RedirectionResolver {
  private readonly LOG_TAG = "suspicious-serverless:redirection-resolver";
  private log = debug(this.LOG_TAG);

  constructor(
    private timeout: number = 5000,
    // tslint:disable-next-line
    private userAgent: string = "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36",
  ) {}

  public async resolve(url: string) {
    const MAX_REDIRECTS = 10;
    let redirectCount = 0;

    const urls: string[] = [url];

    while (redirectCount < MAX_REDIRECTS) {
      try {
        const redirectionUrl = await this.getRedirectionUrl(_.last(urls)!);

        if (redirectionUrl) {
          const matched = linkify.match(redirectionUrl) || [];
          urls.push(...matched.map((l) => l.url));
        } else {
          break;
        }
        redirectCount++;
      } catch (e) {
        this.log("failed to resolve redirection", e.stack);
        break;
      }
    }

    return _.uniq(urls);
  }

  public async getRedirectionUrl(url: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const req = request({
          method: "GET",
          url,
          headers: {
            "User-Agent": this.userAgent,
          },
          followRedirect: false,
          timeout: this.timeout,
        })
        .on("error", onError)
        .on("response", onResponse); // we only need to read response headers

      function onError(e: Error) {
        req.removeListener("response", onResponse);

        reject(e);
      }

      function onResponse(res: request.Response) {
        req.removeListener("error", onError);
        req.abort(); // stop receiving response body

        if (res.statusCode! >= 300 && res.statusCode! < 400 && res.headers.location) {
          return resolve(URL.resolve(url, res.headers.location!));
        }

        resolve(null);
      }
    });
  }
}
