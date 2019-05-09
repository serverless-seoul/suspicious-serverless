import * as sinon from "sinon";

export const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.verifyAndRestore();
});
