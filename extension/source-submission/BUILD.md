# Build instructions

`content.js`, `app-content.js`, and `manifest.json` in the submitted
package are used as-is — no build step, they're already plain source.

`background.js` in the submitted package is the only generated file. It
is a concatenation of two files:

1. `webextension-polyfill` v0.12.0 (minified), MIT/MPL-2.0 licensed,
   an open-source third-party library.
   Source: https://github.com/mozilla/webextension-polyfill
   Exact file used: `dist/browser-polyfill.min.js` from the npm package
   `webextension-polyfill@0.12.0`.
2. `background-src.js` (included in this folder, unminified, human-written).

## Requirements

- Node.js 22.x and npm (any OS — built and tested on Windows via Git Bash;
  the same commands work unchanged on macOS/Linux).

## Build

Run `build.sh` from this folder:

```bash
sh build.sh
```

This installs `webextension-polyfill@0.12.0` and concatenates it with
`background-src.js` to produce `background.js`, identical to the one in
the submitted extension package.
