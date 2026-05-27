import Jimp from 'jimp';
import fs from 'fs';

async function run() {
  try {
    const image = await Jimp.read('build/icon.png');
    image.resize(256, 256);
    // write as an ico file by using png-to-ico on the new PNG buffer
    const buf = await image.getBufferAsync(Jimp.MIME_PNG);
    fs.writeFileSync('build/icon_fixed.png', buf);
    
    // Now let's try to convert this clean PNG to ICO
    import('png-to-ico').then(async (pngToIco) => {
      const icoBuf = await pngToIco.default(buf);
      fs.writeFileSync('build/icon.ico', icoBuf);
      console.log('Successfully created build/icon.ico');
    }).catch(e => {
       console.log('Failed to create ICO, but created icon_fixed.png', e.message);
    });
  } catch (e) {
    console.error(e);
  }
}

run();
