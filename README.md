# plug

[![Tags](https://img.shields.io/github/release/denosaurs/plug)](https://github.com/denosaurs/plug/releases)
[![Checks](https://github.com/denosaurs/plug/actions/workflows/deno.yml/badge.svg)](https://github.com/denosaurs/plug/actions/workflows/deno.yml)
[![Dependencies](https://github.com/denosaurs/plug/actions/workflows/depsbot.yml/badge.svg)](https://github.com/denosaurs/plug/actions/workflows/depsbot.yml)
[![License](https://img.shields.io/github/license/denosaurs/plug)](https://github.com/denosaurs/plug/blob/master/LICENSE)

Plug is a drop in extension for using remote dynamic libraries in deno. It
automatically handles caching and loading with minimal overhead. It can
automatically create the URL for your cross-operating-system, cross-architecture
libraries if you so wish using a simple configuration which deviates from the
standard URL/string path input.

## Example using plug as an almost drop in replacement for `Deno.dlopen`

```ts
import { dlopen } from "https://deno.land/x/plug/mod.ts";

// Drop-in replacement for `Deno.dlopen` which fetches the following depending
// on operating system:
// * darwin: "https://example.com/some/path/libexample.dylib"
// * windows: "https://example.com/some/path/example.dll"
// * unix: "https://example.com/some/path/libexample.so"
const library = await dlopen("https://example.com/some/path/", {
  noop: { parameters: [], result: "void" },
});

library.symbols.noop();
```

## Example using automatic binary name guessing

```ts
import { dlopen, FetchOptions } from "https://deno.land/x/plug/mod.ts";

// If you want plug to guess your binary names
const options: FetchOptions = {
  name: "example",
  url: "https://example.com/some/path/",
  // Becomes:
  // darwin: "https://example.com/some/path/libexample.dylib"
  // windows: "https://example.com/some/path/example.dll"
  // unix: "https://example.com/some/path/libexample.so"
};

const library = await dlopen(options, {
  noop: { parameters: [], result: "void" },
});

library.symbols.noop();
```

## Example using nested cross-platform options

```ts
import { dlopen, FetchOptions } from "https://deno.land/x/plug/mod.ts";

// Also you can specify the path for certain architecture
const options: FetchOptions = {
  name: "example",
  url: {
    darwin: {
      aarch64: `https://example.com/some/path/libexample.aarch64.dylib`,
      x86_64: `https://example.com/some/path/libexample.x86_64.dylib`,
    },
    windows: `https://example.com/some/path/example.dll`,
    linux: `https://example.com/some/path/libexample.so`,
    freebsd: "https://example.com/some/path/libexample_freebsd.so",
    netbsd: "https://example.com/some/path/libexample_netbsd.so",
    aix: "https://example.com/some/path/libexample_aix.so",
    solaris: "https://example.com/some/path/libexample_solaris.so",
    illumos: "https://example.com/some/path/libexample_illumos.so",
  },
};

await dlopen(options, {});
```

## Example using nested cross-platform options and automatic binary name guessing

```ts
import { dlopen, FetchOptions } from "https://deno.land/x/plug/mod.ts";

// Or even configure plug to automatically guess the binary names for you,
// even when there are special rules for naming on specific architectures
const options: FetchOptions = {
  name: "test",
  url: "https://example.com/some/path/",
  suffixes: {
    darwin: {
      aarch64: ".aarch64",
      x86_64: ".x86_64",
    },
  },
  // Becomes:
  // darwin-aarch64: "https://example.com/some/path/libexample.aarch64.dylib"
  // darwin-x86_64: "https://example.com/some/path/libexample.x86_64.dylib"
};

await dlopen(options, {});
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

Copyright 2020-2023, the denosaurs team. All rights reserved. MIT license.
