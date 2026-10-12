
import struct
import zlib

def create_png(width, height, color, filename):
    # A simple script to create a solid color PNG
    # color is (R, G, B)
    
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png += struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # IDAT chunk (pixel data)
    # 1 byte for filter type (0) + 3 bytes per pixel
    row = b'\x00' + bytes(color) * width
    raw_data = row * height
    idat_data = zlib.compress(raw_data)
    idat_crc = zlib.crc32(b'IDAT' + idat_data)
    png += struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    with open(filename, 'wb') as f:
        f.write(png)

create_png(192, 192, (14, 165, 233), 'public/icon-192x192.png') # Tailwind sky-500
create_png(512, 512, (14, 165, 233), 'public/icon-512x512.png')
print('PNGs created!')

