#!/bin/sh
# After `npx cap sync android`: give the TV flavor its own Capacitor config that tags the
# WebView user agent with "ShivBabaTV", so the game switches to TV mode (remote, Lite graphics).
set -e
cd "$(dirname "$0")/.."
node -e '
const fs = require("fs");
const c = JSON.parse(fs.readFileSync("android/app/src/main/assets/capacitor.config.json", "utf8"));
c.appName = "SHIV BABA TV";
c.android = { ...(c.android || {}), appendUserAgent: "ShivBabaTV" };
fs.mkdirSync("android/app/src/tv/assets", { recursive: true });
fs.writeFileSync("android/app/src/tv/assets/capacitor.config.json", JSON.stringify(c, null, "\t") + "\n");
'
echo "TV config written"
