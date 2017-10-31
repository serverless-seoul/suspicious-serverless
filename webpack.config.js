const path = require('path');

module.exports = {
  entry: './src/api',
  target: 'node',
  resolve: {
    alias: {
      // @note This alias is required if building service on Node.js > v6,
      // because webpack tree shaking drops built-in runtime check logic in puppeteer package
      "puppeteer": require.resolve("puppeteer/node6/Puppeteer")
    },
    extensions: [
      '.js',
      '.json',
      '.ts',
      '.tsx'
    ]
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: 'api.js'
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader' }
    ]
  },
  externals: [
    'aws-sdk',
    // @note `@serverless-chrome/lambda` package has extra built chromium binary,
    // which is specially to be handled
    '@serverless-chrome/lambda'
  ]
};