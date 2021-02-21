const webpack = require('webpack')

module.exports = {
    target: 'webworker',
    mode: 'production',
    entry: './src/index.js',
    plugins: [
        new webpack.ProvidePlugin({ URL: 'url-polyfill' })
    ]
}