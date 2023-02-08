const path = require('path');

module.exports = {
   entry : "./src/index.ts",
   mode: "production",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        configFile: "tsconfig.webpack.json"
                    }
                }],
                exclude: /node_modules/,
            }
        ]
    },   
 output: {
    library: 'tidyscripts_web',
    libraryTarget: 'umd',
    filename: 'tidyscripts_web_umd.js',
    globalObject: 'this',
  },  
};
