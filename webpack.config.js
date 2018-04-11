module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: ['babel-polyfill', './src/index.js'],
  output: { filename: 'bundle.js' },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', { browsers: ['last 2 versions'] }]
          ],
          plugins: [
            '@babel/plugin-proposal-object-rest-spread',
            ['@babel/plugin-transform-react-jsx', { pragma: 'h' }]
          ]
        }
      }
    }]
  }
}
