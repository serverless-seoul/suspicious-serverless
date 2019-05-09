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

```
GET /redirection-chain?url=https://vingle.net
Host: API_GATEWAY_ID.execute-api.YOUR_REGION.amazonaws.com
```

#### Response

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf8

["https://vingle.net", "https://www.vingle.net/"]
```


## Getting started

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
