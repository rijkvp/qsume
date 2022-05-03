const path = require('path');
const fs = require('fs');

async function deleteSourceMaps(dir) {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
        if (file.endsWith("js.map")) {
            console.log(`Removing source map ${file}`);
            await fs.promises.unlink(dir + "/" + file);
        }
    }
}

deleteSourceMaps("./dist");

module.exports = {
    entry: './src/main.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                include: [path.resolve(__dirname, 'src')]
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
