# suspicious-serverless

## Business Domain

A collection of utilities for analyze suspicious content, using Serverless Framework.


## Responsibility

- Resolve redirection chain (urls) from given url


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

## Maintainer
