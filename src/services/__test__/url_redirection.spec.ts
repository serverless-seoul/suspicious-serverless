import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as nock from 'nock';

chai.use(chaiAsPromised);
// chai.should();
const expect = chai.expect;

import RedirectionResolver from '../redirection_resolver';

describe("RedirectionResolver", () => {
  let resolver: RedirectionResolver;
  beforeEach(() => {
    resolver = new RedirectionResolver();
  });

  before(() => {
    nock('http://200.response.com')
      .get(/.+/)
      .reply(200, 'OK');

    nock('http://301.response.com')
      .get(/.+/)
      .reply(301, 'Moved Permanently', {
        Location: 'https://www.twitter.com/foo'
      });

    nock('http://302.response.com')
      .get(/.+/)
      .reply(302, 'Moved Temporarily', {
        Location: 'https://www.facebook.com/'
      });

    nock('http://404.response.com')
      .get(/.+/)
      .reply(404, 'Not Found');

    nock('http://502.response.com')
      .get(/.+/)
      .reply(502, 'Bad Gateway');

    nock('http://such.stuck.request.com')
      .get(/.+/)
      .socketDelay(7000)
      .reply(302, 'Moved Temporarily', {
        Location: 'https://www.facebook.com'
      });

    nock('http://such.slow.response.com')
      .get(/.+/)
      .delay({ head: 7000, body: 7000 })
      .reply(302, 'Moved Temporarily', {
        Location: 'https://www.facebook.com'
      });
  });

  describe("._getRedirectionUrl", () => {
    it("should return nothing if server respond with non-3xx status code", async () => {
      expect(await resolver._getRedirectionUrl('http://200.response.com/0x1234', 1000)).to.be.eq(undefined);
      expect(await resolver._getRedirectionUrl('http://404.response.com/a.bc.1/e', 1000)).to.be.eq(undefined);
      expect(await resolver._getRedirectionUrl('http://502.response.com/foo/bar.baz', 1000)).to.be.eq(undefined);
    });


    it("should return redirection url if server respond with 3xx status code", async () => {
      expect(await resolver._getRedirectionUrl('http://301.response.com/0xffff', 1000)).to.be.eq('https://www.twitter.com/foo');
      expect(await resolver._getRedirectionUrl('http://302.response.com/watch-out-facebook', 1000)).to.be.eq('https://www.facebook.com/');
    });

    it("should throw error on read timeout (socket connected, but slow response)", async () => {
      expect(resolver._getRedirectionUrl('http://such.slow.response.com/some/path', 1000)).to.be.rejectedWith(Error);
    });

    it("should throw error on connect timeout (socket connect timeout)", async () => {
      expect(resolver._getRedirectionUrl('http://such.stuck.request.com/foo/bar.baz', 1000)).to.be.rejectedWith(Error);
    });

    it("should ignore response body to prevent DoS attacks", async () => {
      expect(await resolver._getRedirectionUrl('http://download.blender.org/peach/bigbuckbunny_movies/big_buck_bunny_720p_h264.mov', 1000)).to.be.eq(undefined);
    });
  });

  describe(".resolve", () => {
    it("should return redirect chain", async () => {
      const urls = await resolver.resolve('http://click.gl/L8NUWG');
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
        "http://such.slow.response.com/some/path"
      ]);
    });

    it("should handle connect timeout (socket connect timeout)", async () => {
      const urls = await resolver.resolve("http://such.stuck.request.com/foo/bar.baz");

      expect(urls).to.be.deep.eq([
        "http://such.stuck.request.com/foo/bar.baz"
      ]);
    });
  });
});
