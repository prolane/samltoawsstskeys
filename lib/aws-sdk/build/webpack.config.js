// Import path for resolving file paths
var path = require("path");
module.exports = {
  // Specify the entry point for our app.
  entry: [path.join(__dirname, "script.js")],
  // Specify the output file containing our bundled code.
  output: {
    path: path.resolve(__dirname, '../lib'),
    filename: 'aws-js-sdk-bundle.js',
    library: {
      name: 'webpacksts',
      type: 'var',
    }
  },
  mode: 'production',
  // Enable WebPack to use the 'path' package.
  resolve: {
    fallback: { path: require.resolve("path-browserify") }
  }
};