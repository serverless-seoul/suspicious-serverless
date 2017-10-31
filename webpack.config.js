const path = require('path');

module.exports = {
  entry: './src/api',
  target: 'node',
  resolve: {
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