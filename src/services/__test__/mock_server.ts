import * as http from "http";
import * as qs from "querystring";


export const server = http.createServer((req, res) => {
  if (req.url === "/redirection/http") {
    res.writeHead(302, {
      "Location": `/?${qs.stringify({ from: req.url })}`,
    });
    res.end();
    return;
  }

  if (req.url === "/redirection/js") {
    res.writeHead(200, {
      "Content-Type": "text/html",
    });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Foo</title>
  <script type="text/javascript">
    setTimeout(function() {
      location.href = "/?from=" + encodeURIComponent(${JSON.stringify(req.url)});
    }, 1000);
  </script>
</head>
<body>
  EVIL REDIRECTION!
</body>
</html>`);
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/html",
  });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hello</title>
</head>
<body>
  <p>HOLA</p>
</body>
</html>`);
});
