#!/bin/bash

# Script to resize mushroom icon to required Chrome extension sizes
# Usage: ./resize-icon.sh mushroom.png

if [ -z "$1" ]; then
    echo "❌ Error: Please provide the mushroom image file"
    echo "Usage: ./resize-icon.sh mushroom.png"
    exit 1
fi

SOURCE_IMAGE="$1"
ICONS_DIR="icons"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Image file '$SOURCE_IMAGE' not found"
    echo "Please place your mushroom image in the extension folder first"
    exit 1
fi

# Create icons directory if it doesn't exist
mkdir -p "$ICONS_DIR"

echo "🎨 Resizing mushroom icon..."

# Resize to required sizes
sips -z 16 16 "$SOURCE_IMAGE" --out "$ICONS_DIR/icon16.png" > /dev/null 2>&1
sips -z 48 48 "$SOURCE_IMAGE" --out "$ICONS_DIR/icon48.png" > /dev/null 2>&1
sips -z 128 128 "$SOURCE_IMAGE" --out "$ICONS_DIR/icon128.png" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Successfully created icons:"
    echo "   - icon16.png (16x16)"
    echo "   - icon48.png (48x48)"
    echo "   - icon128.png (128x128)"
    echo ""
    echo "🎉 Done! Reload your extension to see the new icon."
else
    echo "❌ Error: Failed to resize image"
    exit 1
fi

