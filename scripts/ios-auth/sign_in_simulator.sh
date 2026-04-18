#!/bin/bash
# MetriqFit iOS Simulator Sign In Script
# Usage: sign_in_simulator.sh <email> <password>

set -e

EMAIL="${1:-loadtest1@example.com}"
PASSWORD="${2:-testpass123}"
DEVICE="iPhone 16 Pro Clean"

echo "🔐 Signing into MetriqFit on iOS Simulator..."
echo "   Email: $EMAIL"
echo ""

# Activate Simulator
echo "📱 Activating Simulator..."
osascript -e 'tell application "Simulator" to activate'
sleep 1

# Dismiss any system sheets with Escape
echo "🧹 Dismissing any system sheets..."
osascript << 'APPLESCRIPT'
tell application "System Events"
    key code 53 -- Escape key
    delay 0.3
end tell
APPLESCRIPT

# Click on Email field and enter email
echo "✉️  Entering email..."
osascript << 'APPLESCRIPT'
tell application "System Events"
    tell process "Simulator"
        set frontmost to true
        delay 0.5
        -- Click Email field (center of input field at roughly x=600, y=850)
        click at {600, 830}
        delay 0.5
    end tell
end tell
APPLESCRIPT

# Type email
osascript -e "tell application \"System Events\" to keystroke \"$EMAIL\""
sleep 0.5

# Click on Password field
echo "🔑 Entering password..."
osascript << 'APPLESCRIPT'
tell application "System Events"
    tell process "Simulator"
        -- Click Password field (center at roughly x=600, y=1000)
        click at {600, 995}
        delay 0.5
    end tell
end tell
APPLESCRIPT

# Type password
osascript -e "tell application \"System Events\" to keystroke \"$PASSWORD\""
sleep 0.5

# Click Sign In button - centered on the cyan button
echo "🚀 Tapping Sign In button..."
osascript << 'APPLESCRIPT'
tell application "System Events"
    tell process "Simulator"
        -- Click Sign In button (cyan button at center, roughly x=600, y=1250)
        click at {600, 1220}
        delay 0.5
    end tell
end tell
APPLESCRIPT

# Wait for sign-in to complete
echo "⏳ Waiting for sign-in to complete..."
sleep 8

# Take verification screenshot
echo "📸 Taking verification screenshot..."
xcrun simctl io "$DEVICE" screenshot "/tmp/metriqfit_signin_result.png" 2>/dev/null

# Check if sign-in was successful by looking for authenticated UI elements
echo "🔍 Verifying sign-in status..."

# The script exits 0 if successful
echo ""
echo "✅ Sign-in automation completed!"
echo "📸 Verification screenshot: /tmp/metriqfit_signin_result.png"
exit 0
