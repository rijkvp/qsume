const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const devMode = process.env.NODE_ENV !== "production";

module.exports = {
    entry: ['./src/main.ts', './src/style.css'],
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                include: [path.resolve(__dirname, 'src')]
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, './dist'),
    },
    performance: {
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Qsume',
            template: './src/index.html',
            inject: 'body',
            filename: 'index.html'
        }),
        new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/bundle/]),
    ],
};
