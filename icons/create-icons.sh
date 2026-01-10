#!/bin/bash

# 创建简单的彩色PNG图标
# 使用ImageMagick创建图标

for size in 16 48 128; do
  # 如果有convert命令（ImageMagick），使用它
  if command -v convert &> /dev/null; then
    convert -size ${size}x${size} xc:none \
      -fill "rgb(102,126,234)" \
      -draw "circle $((size/2)),$((size/2)) $((size/2)),$((size/4))" \
      -fill white \
      -font Arial -pointsize $((size/2)) -gravity center \
      -annotate +0+0 "✓" \
      icon${size}.png
  else
    # 创建简单的纯色PNG作为占位符
    printf "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00${size}\x00\x00\x00${size}\x08\x02\x00\x00\x00" > icon${size}.png
    echo "注意: ImageMagick未安装，已创建占位符图标。请使用generate-icons.html生成实际图标。"
  fi
done

