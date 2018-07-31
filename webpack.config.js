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
            [
              '@babel/preset-env',
              {
                targets: {
                  browsers: [
                    '>0.25%',
                    'not ie 11',
                    'not op_mini all'
                  ]
                }
              }
            ]
          ],
          plugins: [
            '@babel/plugin-proposal-object-rest-spread',
            '@babel/plugin-proposal-class-properties',
            ['@babel/plugin-transform-react-jsx', { pragma: 'h' }]
          ]
        }
      }
    }]
  }
}
