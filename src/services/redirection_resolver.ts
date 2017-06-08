import * as URL from 'url';
import * as request from 'request';
import * as _ from 'lodash';
const linkify = require('linkify-it')();

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


export default class RedirectionResolver {
  async _getRedirectionUrl(url: string, timeout: number) {
    return new Promise((resolve, reject) => {
      let req = request({
        method: 'GET',
        url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
        },
        followRedirect: false,
        timeout,
      }).on('error', (e) => {
        clearTimeout(timerId);
        req.removeAllListeners(); // clean up event listeners

        reject(e);
      }).on('response', (res) => { // we only need to read response headers
        clearTimeout(timerId);
        req.removeAllListeners(); // clean up event listeners
        req.abort(); // stop receiving response body

        if (res.statusCode! >= 300 && res.statusCode! < 400) {
          resolve(URL.resolve(url, res.headers['location']));
        }

        resolve();
      });

      let timerId = setTimeout(() => {
        req.abort();
        reject(new Error(`reached read timeout ${timeout}ms`));
      }, timeout);
    }) as Promise<string>;
  }

  async resolve(url: string) {
    const MAX_REDIRECTS = 10;
    let redirectCount = 0;

    const urls: string[] = [url];


    while (redirectCount < MAX_REDIRECTS) {
      try {
        const redirectionUrl = await this._getRedirectionUrl(_.last(urls)!, 5000);

        if (redirectionUrl) {
          urls.push(...linkifyMatch(redirectionUrl).map(l => l.url));
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
}
