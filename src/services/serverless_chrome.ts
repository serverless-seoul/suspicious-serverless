// This module simply wraps exported function that came from package,
// because that's impossible stubbing exported function.

import * as launchChrome from "@serverless-chrome/lambda";

export { launchChrome };
