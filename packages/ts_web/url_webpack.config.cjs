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
                        configFile: "url_based_tsconfig.webpack.json"  
                    }
                }],
                exclude: /node_modules/,
            }
      ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    library:  {
	      type : 'umd' ,
	      name : "tidyscripts" , 
    } ,
    globalObject : 'this' , 
  },
};
