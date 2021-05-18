# plug

[![Tags](https://img.shields.io/github/release/denosaurs/plug)](https://github.com/denosaurs/plug/releases)
[![Checks](https://github.com/denosaurs/plug/actions/workflows/deno.yml/badge.svg)](https://github.com/denosaurs/plug/actions/workflows/deno.yml)
[![Dependencies](https://github.com/denosaurs/plug/actions/workflows/depsbot.yml/badge.svg)](https://github.com/denosaurs/plug/actions/workflows/depsbot.yml)
[![License](https://img.shields.io/github/license/denosaurs/plug)](https://github.com/denosaurs/plug/blob/master/LICENSE)

Plugin management library featuring automatic caching of local and remote
binaries, cross-platform automatic url guessing,
[deno_plugin_prepare](https://github.com/manyuanrong/deno-plugin-prepare)
backwards compatibility and pretty deno-like logging when caching and
downloading binaries.

---

> ⚠️ Plugins in deno are unstable and undergoing BREAKING CHANGES. This library
> aims to follow changes to deno as closly as possible.

---

```typescript
import { Plug } from "https://deno.land/x/plug/mod.ts";

// Backwards compatibility with deno-plugin-prepare
const options: Plug.Options = {
  name: "test_plugin",
  urls: {
    darwin: `https://example.com/some/path/libtest_plugin.dylib`,
    windows: `https://example.com/some/path/test_plugin.dll`,
    linux: `https://example.com/some/path/libtest_plugin.so`,
  },
};

// Or if you want plug to guess your binary names
const options: Plug.Options = {
  name: "test_plugin",
  url: "https://example.com/some/path/",
  // Becomes:
  // darwin: "https://example.com/some/path/libtest_plugin.dylib"
  // windows: "https://example.com/some/path/test_plugin.dll"
  // linux: "https://example.com/some/path/libtest_plugin.so"
};

const rid = await Plug.prepare(options);

const response = Plug.core.opSync<string>(
  "op_test_sync",
  { val: "1" },
  new Uint8Array([116, 101, 115, 116]),
);
```

## Other

### Related

- [deno_plugin_prepare](https://github.com/manyuanrong/deno-plugin-prepare) - A
  library for managing deno native plugin dependencies
- [cache](https://github.com/denosaurs/cache) - Deno cache library

### Contribution

Pull request, issues and feedback are very welcome. Code style is formatted with
`deno fmt` and commit messages are done following Conventional Commits spec.

### Licence

Copyright 2020-2021, the denosaurs team. All rights reserved. MIT license.
