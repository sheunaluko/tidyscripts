const path = require('path');

module.exports = {
   entry : "./src/index.ts", 
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
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  experiments: {
    outputModule: true,
  },
  output: {
    library:  {
	      type : 'commonjs' ,
    } ,
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js'
  },
};
