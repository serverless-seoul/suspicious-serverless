import { expect } from "chai";
import * as nock from "nock";

import { RedirectionResolver } from "../redirection_resolver";

describe(RedirectionResolver.name, () => {
  let resolver: RedirectionResolver;

  beforeEach(() => {
    nock("http://200.response.com")
      .get(/.+/)
      .reply(200, "OK");

    nock("http://301.response.com")
      .get(/.+/)
      .reply(301, "Moved Permanently", {
        Location: "https://www.twitter.com/foo",
      });

    nock("http://302.response.com")
      .get(/.+/)
      .reply(302, "Moved Temporarily", {
        Location: "https://www.facebook.com/",
      });

    nock("http://404.response.com")
      .get(/.+/)
      .reply(404, "Not Found");

    nock("http://502.response.com")
      .get(/.+/)
      .reply(502, "Bad Gateway");

    nock("http://such.stuck.request.com")
      .get(/.+/)
      .socketDelay(7000)
      .reply(302, "Moved Temporarily", {
        Location: "https://www.facebook.com",
      });

    nock("http://such.blocked.request.com")
      .get(/.+/)
      .delayConnection(7000)
      .reply(302, "Moved Temporarily", {
        Location: "https://www.facebook.com",
      });

    nock("http://such.slow.response.com")
      .get(/.+/)
      .delay({ head: 7000, body: 7000 })
      .reply(302, "Moved Temporarily", {
        Location: "https://www.facebook.com",
      });

    resolver = new RedirectionResolver();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe(".getRedirectionUrl", () => {
    it("should return null if server respond with non-3xx status code", async () => {
      expect(await resolver.getRedirectionUrl("http://200.response.com/0x1234")).to.be.eq(null);
      expect(await resolver.getRedirectionUrl("http://404.response.com/a.bc.1/e")).to.be.eq(null);
      expect(await resolver.getRedirectionUrl("http://502.response.com/foo/bar.baz")).to.be.eq(null);
    });

    it("should return redirection url if server respond with 3xx status code", async () => {
      expect(await resolver.getRedirectionUrl("http://301.response.com/0xffff"))
        .to.be.eq("https://www.twitter.com/foo");
      expect(await resolver.getRedirectionUrl("http://302.response.com/watch-out-facebook"))
        .to.be.eq("https://www.facebook.com/");
    });

    it("should throw error on read timeout (socket connected, but slow response)", async () => {
      let caught: Error | undefined;

      try {
        await resolver.getRedirectionUrl("http://such.slow.response.com/some/path");
      } catch (e) {
        caught = e;
      }

      expect(caught).to.be.instanceOf(Error);
    });

    it("should throw error on connect timeout (socket connect timeout)", async () => {
      let caught: Error | undefined;

      try {
        await resolver.getRedirectionUrl("http://such.stuck.request.com/foo/bar.baz");
      } catch (e) {
        caught = e;
      }

      expect(caught).to.be.instanceOf(Error);
    });

    it("should ignore response body to prevent DoS attacks", async () => {
      // tslint:disable-next-line
      expect(await resolver.getRedirectionUrl("https://download.blender.org/peach/bigbuckbunny_movies/big_buck_bunny_720p_h264.mov")).to.be.eq(null);
    });
  });

  describe(".resolve", () => {
    beforeEach(() => {
      nock("http://click.gl")
        .get("/L8NUWG")
        .reply(302, "Moved Temporarily", {
          Location: "http://boxs.kr/1K5YT",
        });

      nock("http://boxs.kr")
        .get("/1K5YT")
        .reply(302, "Moved Temporarily", {
          Location: "http://boxs.kr/index.php?url=1K5YT",
        })
        .get("/index.php?url=1K5YT")
        .reply(302, "Moved Temporarily", {
          Location: "http://iii.im/1aX9",
        });

      nock("http://iii.im")
        .get("/1aX9")
        .reply(302, "Moved Temporarily", {
          Location: "http://auto-man.kr/%EC%9C%A4%EC%88%98%EC%98%811",
        });

      nock("http://auto-man.kr")
        .get("/%EC%9C%A4%EC%88%98%EC%98%811")
        .reply(302, "Moved Temporarily", {
          // tslint:disable-next-line
          Location: "https://play.google.com/store/apps/details?id=kr.automan.app2&referrer=e3JlY29tbToi7Jyk7IiY7JiBMSJ9",
        });

      nock("http://such.stuck.request.com")
        .get(/.+/)
        .socketDelay(7000)
        .reply(302, "Moved Temporarily", {
          Location: "https://www.facebook.com",
        });

      nock("http://such.slow.response.com")
        .get(/.+/)
        .delay({ head: 7000, body: 7000 })
        .reply(302, "Moved Temporarily", {
          Location: "https://www.facebook.com",
        });
    });

    it("should return redirect chain", async () => {
      const urls = await resolver.resolve("http://click.gl/L8NUWG");
      expect(urls).to.be.deep.eq([
        "http://click.gl/L8NUWG",
        "http://boxs.kr/1K5YT",
        "http://boxs.kr/index.php?url=1K5YT",
        "http://iii.im/1aX9",
        "http://auto-man.kr/%EC%9C%A4%EC%88%98%EC%98%811",
        "https://play.google.com/store/apps/details?id=kr.automan.app2&referrer=e3JlY29tbToi7Jyk7IiY7JiBMSJ9",
      ]);
    });

    it("should handle read timeout (socket connected, but slow response)", async () => {
      const urls = await resolver.resolve("http://such.slow.response.com/some/path");

      expect(urls).to.be.deep.eq([
        "http://such.slow.response.com/some/path",
      ]);
    });

    it("should handle connect timeout (socket connect timeout)", async () => {
      const urls = await resolver.resolve("http://such.stuck.request.com/foo/bar.baz");

      expect(urls).to.be.deep.eq([
        "http://such.stuck.request.com/foo/bar.baz",
      ]);
    });

    it("should handle connect timeout (dns query timeout)", async () => {
      const urls = await resolver.resolve("http://www.vingle.net:81/hello");

      expect(urls).to.be.deep.eq([
        "http://www.vingle.net:81/hello",
      ]);
    });
  });
});
