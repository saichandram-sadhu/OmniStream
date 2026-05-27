const pngToIco = require('png-to-ico');
const fs = require('fs');
pngToIco('build/icon.png')
  .then(buf => {
    fs.writeFileSync('build/icon.ico', buf);
    console.log("Icon converted successfully!");
  })
  .catch(console.error);
