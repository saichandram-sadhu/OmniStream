import pngToIco from 'png-to-ico';
import fs from 'fs';

pngToIco('build/icon.png')
  .then(buf => {
    fs.writeFileSync('build/icon.ico', buf);
    console.log("Success!");
  })
  .catch(console.error);
