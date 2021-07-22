const path = require('path')
const webpack = require('webpack')

module.exports = {
  target: 'node',
  entry: './src/shortcodes-tokenizer.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'shortcodes-tokenizer.js',
    library: 'shortcodesTokenizer',
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
      },
    ],
  },
}
