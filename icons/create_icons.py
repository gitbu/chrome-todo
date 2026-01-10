#!/usr/bin/env python3
"""生成简单的Todo Manager图标"""

def create_simple_png(filename, size):
    """创建一个简单的PNG图标"""
    # 这是一个最小的PNG文件（1x1像素，灰色）
    # 实际使用时，建议使用generate-icons.html生成更好看的图标
    png_data = (
        b'\x89PNG\r\n\x1a\n'  # PNG signature
        b'\x00\x00\x00\rIHDR'  # IHDR chunk
        b'\x00\x00\x00\x01'  # width (1)
        b'\x00\x00\x00\x01'  # height (1)
        b'\x08\x02'  # bit depth (8), color type (2 = RGB)
        b'\x00\x00\x00'  # compression, filter, interlace
        b'\x90wS\xde'  # CRC
        b'\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05'  # IDAT chunk with pixel data
        b'\x18\r\n\x1d\xf2'  # CRC
        b'\x00\x00\x00\x00IEND\xae B`\x82'  # IEND chunk
    )

    with open(filename, 'wb') as f:
        f.write(png_data)
    print(f"Created {filename}")

if __name__ == '__main__':
    create_simple_png('icon16.png', 16)
    create_simple_png('icon48.png', 48)
    create_simple_png('icon128.png', 128)
    print("\n提示: 这些是占位符图标。")
    print("请在浏览器中打开 generate-icons.html 来生成更好看的图标。")
