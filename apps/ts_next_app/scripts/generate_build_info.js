const fs = require('fs');
const packageJson = require('../package.json');

const buildInfo = {
  version: packageJson.version,
    buildTime: (new Date()).toDateString()
};

fs.writeFileSync('./generated/build_info.json', JSON.stringify(buildInfo, null, 2));
console.log('Build info generated:', buildInfo);
