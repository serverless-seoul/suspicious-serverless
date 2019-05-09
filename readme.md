# suspicious-serverless

## Business Domain

A collection of utilities for analyzing suspicious content, using Serverless Framework.


## Responsibility

- Resolve redirection chain (urls) from given url
- Inspect page content from given url
  - Detect client-side page redirection
  - Detect client-side page rendering (e.g. React app)


## Usage


### Get redirection chain (urls)

Resolve redirection chain (urls) from given url.

#### Request

```http
GET /stage/redirection-chain?url=http://vin.gl/p/12345 HTTP/1.1
Host: API_GATEWAY_ID.execute-api.YOUR_REGION.amazonaws.com
```

#### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"data":["http://vin.gl/p/12345","https://vin.gl/p/12345","https://www.vingle.net/posts/12345"]}
```


### Get inspected page content

Get inspected page content.

Inspection will be performed through Chrome browser.

Currently we provide two kinds of inspected page content:

##### List of navigated urls - `navigatedUrls`

For example, Evil attacker may hijack users using Javascript-based navigation: 

```js
setTimeout(() => {
  location.href = 'https://evil-website.com/payment';
}, 1000);
```

In this case, HTTP-based redirection detection can't be used.
To detect client-slide navigation, This API spawns browser and watches navigation events internally to detect client-side redirection.


##### Rendered HTML content

For example, Evil attacker may modify page content using Javascript:

```js
window.onload = () => {
  const evilLink = '<a href="https://evil-website.com/payment" target="_blank">Click me to get free iPhone X!</a>';
  document.body.innerHTML += evilLink;
};
```

In this case, HTTP-based content inspection can't be used.
To detect client-slide page rendering, This API spawns browser and watches load events to get modified page content.

#### Request

```http
GET /stage/content?url=https://balmbees.github.io/suspicious-serverless/examples/evil-client-redirection/ HTTP/1.1
Host: API_GATEWAY_ID.execute-api.YOUR_REGION.amazonaws.com
```

#### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "data": {
    "navigatedUrls": ["https://balmbees.github.io/suspicious-serverless/examples/evil-client-redirection/", "https://balmbees.github.io/suspicious-serverless/examples/evil-client-redirection/redirected-page.html"],
    "html": "<!DOCTYPE html><html lang=\"en\"><head>\n  <meta charset=\"UTF-8\">\n  <title>Evil Client-side redirection</title>\n</head>\n<body>\n<p>\n  Please wait a moment to get prize, This is limited time offer!\n</p>\n<script type=\"text/javascript\">\n  window.onload = () => {\n    const evilLink = '<a href=\"https://evil-website.com/payment\" target=\"_blank\">Click me to get free iPhone X!</a>';\n    document.body.innerHTML += evilLink;\n  };\n</script>\n\n\n<a href=\"https://evil-website.com/payment\" target=\"_blank\">Click me to get free iPhone X!</a></body></html>"
  }
}
```

Compare results with [source](https://github.com/balmbees/suspicious-serverless/tree/master/docs/examples/evil-client-redirection) / [demo](https://balmbees.github.io/suspicious-serverless/examples/evil-client-redirection/)    


## Deploy

```bash
$ npm run deploy:stage # for staging 
$ npm run deploy:prod # for production 
```

## Testing

```bash
$ npm run test
```

## Debugging

To see debug logs, Set `DEBUG` environment variable to `suspicious-serverless*`.


## Maintainer

[MooYeol Prescott Lee (@mooyoul)](https://github.com/mooyoul)
