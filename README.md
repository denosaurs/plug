# plug

[![Tags](https://img.shields.io/github/release/denosaurs/plug)](https://github.com/denosaurs/plug/releases)
[![Checks](https://github.com/denosaurs/plug/actions/workflows/deno.yml/badge.svg)](https://github.com/denosaurs/plug/actions/workflows/deno.yml)
[![Dependencies](https://github.com/denosaurs/plug/actions/workflows/depsbot.yml/badge.svg)](https://github.com/denosaurs/plug/actions/workflows/depsbot.yml)
[![License](https://img.shields.io/github/license/denosaurs/plug)](https://github.com/denosaurs/plug/blob/master/LICENSE)

FFI Plugin management library featuring automatic caching of local and remote
binaries, cross-platform automatic url guessing,
[deno_plugin_prepare](https://github.com/manyuanrong/deno-plugin-prepare)
backwards compatibility and pretty deno-like logging when caching and
downloading binaries.

---

> ⚠️ FFI in deno is unstable and undergoing BREAKING CHANGES. This library aims
> to follow changes to deno as closly as possible.

---

```typescript
import { Plug } from "https://deno.land/x/plug/mod.ts";

// Backwards compatibility with deno-plugin-prepare
const options: Plug.Options = {
  name: "test_lib",
  urls: {
    darwin: `https://example.com/some/path/libtest_lib.dylib`,
    windows: `https://example.com/some/path/test_lib.dll`,
    linux: `https://example.com/some/path/libtest_lib.so`,
  },
};

// Or if you want plug to guess your binary names
const options: Plug.Options = {
  name: "test_lib",
  url: "https://example.com/some/path/",
  // Becomes:
  // darwin: "https://example.com/some/path/libtest_lib.dylib"
  // windows: "https://example.com/some/path/test_lib.dll"
  // linux: "https://example.com/some/path/libtest_lib.so"
};

// Drop-in replacement for `Deno.dlopen`
const library = await Plug.prepare(options, {
  noop: { parameters: [], result: "void" },
});

library.symbols.noop();
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

Copyright 2020-2022, the denosaurs team. All rights reserved. MIT license.
