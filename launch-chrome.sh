#!/bin/bash
# Launch Chrome with remote debugging enabled for tinder-cli
# Usage: bash launch-chrome.sh

PORT=9222
PROFILE_DIR="/tmp/chrome-debug"
URL="https://tinder.com/app/recs"

OS="$(uname -s)"

case "$OS" in
  Darwin)
    CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    pkill -f "Google Chrome" 2>/dev/null
    sleep 2
    "$CHROME" --remote-debugging-port=$PORT --user-data-dir="$PROFILE_DIR" "$URL" &
    ;;
  Linux)
    pkill -f chrome 2>/dev/null
    sleep 2
    google-chrome --remote-debugging-port=$PORT --user-data-dir="$PROFILE_DIR" "$URL" &
    ;;
  *)
    echo "Windows detected. Run this in cmd instead:"
    echo ""
    echo '  "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\tmp\chrome-debug"'
    echo ""
    exit 0
    ;;
esac

sleep 3
echo ""
echo "Chrome launched on port $PORT"
echo "Log into Tinder in the Chrome window, then run: tinder-agent auto-swipe"
