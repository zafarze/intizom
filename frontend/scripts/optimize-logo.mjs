import sharp from 'sharp';

const info = await sharp('src/assets/logo.png')
  .resize({ width: 400 })
  .webp({ quality: 82 })
  .toFile('src/assets/logo.webp');

console.log('OK', info.size, 'bytes', info.width + 'x' + info.height);
