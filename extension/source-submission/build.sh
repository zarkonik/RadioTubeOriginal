#!/bin/sh
# Reproduces background.js from this folder's background-src.js plus the
# webextension-polyfill library.
#
# Requirements: Node.js 22.x + npm (any OS — tested on Windows via Git
# Bash, should work identically on macOS/Linux).
set -e

npm install webextension-polyfill@0.12.0
cat node_modules/webextension-polyfill/dist/browser-polyfill.min.js background-src.js > background.js

echo "Built background.js"
