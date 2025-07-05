const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
   entry : "./src/index.ts",
   optimization: {
     minimize: true,
     minimizer: [
       new TerserPlugin({
         terserOptions: {
           keep_fnames: true,
           mangle: {
             keep_fnames: true
           }
         }
       })
     ]
   },
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
