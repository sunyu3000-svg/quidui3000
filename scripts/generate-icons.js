const fs = require('fs');
const path = require('path');

const iconDir = path.join(__dirname, '../images');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

function createPNG(color) {
  const width = 48;
  const height = 48;
  
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, typeBuf, data, crc]);
  }
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  const raw = [];
  const cx = width / 2, cy = height / 2, r = width / 3;
  for (let y = 0; y < height; y++) {
    raw.push(0);
    for (let x = 0; x < width; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d < r) {
        raw.push(color[0], color[1], color[2], 255);
      } else {
        raw.push(0, 0, 0, 0);
      }
    }
  }
  
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(raw));
  
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const gray = [102, 102, 102];
const red = [220, 38, 38];

fs.writeFileSync(path.join(iconDir, 'tab-home.png'), createPNG(gray));
fs.writeFileSync(path.join(iconDir, 'tab-home-active.png'), createPNG(red));
fs.writeFileSync(path.join(iconDir, 'tab-detail.png'), createPNG(gray));
fs.writeFileSync(path.join(iconDir, 'tab-detail-active.png'), createPNG(red));
fs.writeFileSync(path.join(iconDir, 'tab-ledger.png'), createPNG(gray));
fs.writeFileSync(path.join(iconDir, 'tab-ledger-active.png'), createPNG(red));
fs.writeFileSync(path.join(iconDir, 'tab-my.png'), createPNG(gray));
fs.writeFileSync(path.join(iconDir, 'tab-my-active.png'), createPNG(red));
fs.writeFileSync(path.join(iconDir, 'tab-signup.png'), createPNG(gray));
fs.writeFileSync(path.join(iconDir, 'tab-signup-active.png'), createPNG(red));

console.log('Icons generated successfully');
