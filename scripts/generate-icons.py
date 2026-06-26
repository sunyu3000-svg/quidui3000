import zlib
import struct
import os

def crc32(data):
    crc = 0xFFFFFFFF
    table = []
    for i in range(256):
        c = i
        for j in range(8):
            c = (c & 1) and (0xEDB88320 ^ (c >> 1)) or (c >> 1)
        table.append(c)
    for byte in data:
        crc = table[(crc ^ byte) & 0xFF] ^ (crc >> 8)
    return (crc ^ 0xFFFFFFFF) & 0xFFFFFFFF

def create_png(color):
    width = 48
    height = 48
    signature = b'\x89PNG\r\n\x1a\n'
    
    def chunk(type_name, data):
        length = struct.pack('>I', len(data))
        type_bytes = type_name.encode('ascii')
        crc_data = type_bytes + data
        crc = struct.pack('>I', crc32(crc_data))
        return length + type_bytes + data + crc
    
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    
    raw = []
    cx, cy, r = width/2, height/2, width/3
    for y in range(height):
        raw.append(0)
        for x in range(width):
            d = ((x-cx)**2 + (y-cy)**2)**0.5
            if d < r:
                raw.extend([color[0], color[1], color[2], 255])
            else:
                raw.extend([0, 0, 0, 0])
    
    compressed = zlib.compress(bytes(raw))
    
    return signature + chunk('IHDR', ihdr) + chunk('IDAT', compressed) + chunk('IEND', b'')

gray = [102, 102, 102]
red = [220, 38, 38]

os.makedirs('images', exist_ok=True)

icons = ['tab-home', 'tab-detail', 'tab-ledger', 'tab-my', 'tab-signup']
for name in icons:
    with open(f'images/{name}.png', 'wb') as f:
        f.write(create_png(gray))
    with open(f'images/{name}-active.png', 'wb') as f:
        f.write(create_png(red))

print('Icons created successfully')
