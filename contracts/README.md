# Contracts (timemint_contracts)

Rust-based Stylus contract for TimeMint Protocol.

## Build & Test

```sh
# in root
pm install
pnpm --filter contracts build
pnpm --filter contracts test
```
---

## `packages/react-timemint-component/package.json`
```json
{
  "name": "react-timemint-component",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0",
    "ethers": "^6.0.0"
  },
  "dependencies": {
    "@timemint/contracts": "workspace:*",
    "@wagmi/core": "^1.0.0",
    "@googleapis/calendar": "^4.0.0"
  }
}