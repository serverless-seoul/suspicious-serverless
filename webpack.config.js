const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/api',
  target: 'node',
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader' },
      { test: /\.json$/, loader: 'json-loader' },
    ],
  },
  resolve: {
    root: __dirname,
    extensions: ['', '.ts', '.js', '.json'],
    alias: {
      "@client": path.join(__dirname, "client/dist"),
    },
  },
  output: {
    libraryTarget: 'commonjs',
    path: '.webpack',
    filename: 'api.js', // this should match the first part of function handler in serverless.yml
  },
  externals: ['aws-sdk', 'electron'],
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    // new webpack.optimize.UglifyJsPlugin({ minimize: true, sourceMap: false, warnings: false }),
  ],
};
