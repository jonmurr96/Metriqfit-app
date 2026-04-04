#!/bin/bash

# Download Exercise GIFs Script
# Downloads 1,323 exercise animation GIFs from the exercises-gifs repository
# Total size: ~370MB

set -e

REPO_URL="https://github.com/omercotkd/exercises-gifs.git"
TEMP_DIR="temp-exercises-gifs"
TARGET_DIR="assets/exercises"

echo "📥 Downloading exercise GIFs..."
echo "Repository: $REPO_URL"
echo "Target: $TARGET_DIR"
echo ""

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Clone the repository (shallow clone to save time/space)
echo "⬇️  Cloning repository..."
git clone --depth 1 "$REPO_URL" "$TEMP_DIR"

# Copy GIF files
echo "📦 Copying GIF files..."
cp -v "$TEMP_DIR"/assets/*.gif "$TARGET_DIR/"

# Copy CSV metadata
echo "📄 Copying metadata..."
cp -v "$TEMP_DIR/exercises.csv" "$TARGET_DIR/"

# Clean up
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

# Count files
GIF_COUNT=$(ls -1 "$TARGET_DIR"/*.gif 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$TARGET_DIR" | cut -f1)

echo ""
echo "✅ Download complete!"
echo "   GIFs downloaded: $GIF_COUNT"
echo "   Total size: $TOTAL_SIZE"
echo ""
echo "💡 Tip: These GIFs are gitignored due to size."
echo "   Run this script again if you need to re-download them."
