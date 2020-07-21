# plug 

Plugin management library.

---
> ⚠️ Plugins in deno are unstable and undergoing BREAKING CHANGES.
> this library aims to follow changes to the stdlib as closly as
> possible.
---

```typescript
import { Plug } from "https://deno.land/x/plug/mod.ts";

// Backwards compatibility with deno-plugin-prepare
const options: Plug.Options = {
  name: "test_plugin",
  urls: {
    darwin: `${path}/libtest_plugin.dylib`,
    windows: `${path}/test_plugin.dll`,
    linux: `${path}/libtest_plugin.so`,
  }
};

// Or if you want plug to guess your binary names
const options: Plug.Options = {
  name: "test_plugin",
  url: "https://example.com/some/path/"
  // Becomes:
  // darwin: "https://example.com/some/path/libtest_plugin.dylib"
  // windows: "https://example.com/some/path/test_plugin.dll"
  // linux: "https://example.com/some/path/libtest_plugin.so"
};

const rid = await Plug.prepare(options);

const { testSync } = Plug.core.ops();
const response = Plug.core.dispatch(
  testSync,
  ...
);

Deno.close(rid);
```

## other

### contribution

Pull request, issues and feedback are very welcome. Code style is formatted with `deno fmt` and commit messages are done following [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) spec.

### licence

Copyright 2020-present, the denosaurs team. All rights reserved. MIT license.
