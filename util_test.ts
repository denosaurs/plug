import {
  assert,
  assertEquals,
  assertRejects,
  assertThrows,
  basename,
  dirname,
  fromFileUrl,
  join,
  normalize,
} from "./test_deps.ts";
import {
  cacheDir,
  denoCacheDir,
  hash,
  homeDir,
  isFile,
  stringToURL,
  urlToFilename,
} from "./util.ts";

Deno.test("hash", async () => {
  assertEquals(
    await hash("hello_world"),
    "35072c1ae546350e0bfa7ab11d49dc6f129e72ccd57ec7eb671225bbd197c8f1",
  );
});

Deno.test("stringToURL", async ({ step }) => {
  await step("relative", () => {
    const path = "./test/example";
    const result = stringToURL(path);
    assertEquals(
      result.toString(),
      new URL("./test/example", import.meta.url).toString(),
    );
  });

  await step("file", () => {
    const path = "file:///test/example";
    const result = stringToURL(path);
    assertEquals(result.toString(), "file:///test/example");
  });

  await step("http", () => {
    const path = "http://example.com/example";
    const result = stringToURL(path);
    assertEquals(result.toString(), "http://example.com/example");
  });

  await step("https", () => {
    const path = "https://example.com/example";
    const result = stringToURL(path);
    assertEquals(result.toString(), "https://example.com/example");
  });
});

Deno.test("urlToFilename", async ({ step }) => {
  await step("http", async () => {
    assertEquals(
      await urlToFilename(new URL("http://example.com/example.dll")),
      normalize(
        "http/example.com/59338ff59a9d830098ca938e773c9181f03cecb659c2e4ebb0f03e452ba7658a",
      ),
    );
    assertEquals(
      await urlToFilename(new URL("http://example.com/example.dll?query")),
      normalize(
        "http/example.com/1a09f794c64f412ec501e93217c3b00f9e708a80dc6ed97f24536730bd6faab5",
      ),
    );
    assertEquals(
      await urlToFilename(new URL("http://example.com:8000/example.dll")),
      normalize(
        "http/example.com_PORT8000/59338ff59a9d830098ca938e773c9181f03cecb659c2e4ebb0f03e452ba7658a",
      ),
    );
  });

  await step("https", async () => {
    assertEquals(
      await urlToFilename(new URL("https://example.com/example.dll")),
      normalize(
        "https/example.com/59338ff59a9d830098ca938e773c9181f03cecb659c2e4ebb0f03e452ba7658a",
      ),
    );
    assertEquals(
      await urlToFilename(new URL("https://example.com/example.dll?query")),
      normalize(
        "https/example.com/1a09f794c64f412ec501e93217c3b00f9e708a80dc6ed97f24536730bd6faab5",
      ),
    );
    assertEquals(
      await urlToFilename(new URL("https://example.com:8000/example.dll")),
      normalize(
        "https/example.com_PORT8000/59338ff59a9d830098ca938e773c9181f03cecb659c2e4ebb0f03e452ba7658a",
      ),
    );
  });

  await step("file", async () => {
    assertEquals(
      await urlToFilename(new URL("file:///example.dll")),
      normalize(
        "file/59338ff59a9d830098ca938e773c9181f03cecb659c2e4ebb0f03e452ba7658a",
      ),
    );

    assertEquals(
      await urlToFilename(new URL("file:///example/example.dll")),
      normalize(
        "file/5b29f3c30f4f5542089bad8a1cada0fd9c87cc365d9634633657716cf1803102",
      ),
    );

    assertEquals(
      await urlToFilename(new URL("file:///example/abc/example.dll")),
      normalize(
        "file/bfb7be7a0a041e8ffbdfee2db02c4e5ef5fa7e0c5b283f92de2f071ecfcad421",
      ),
    );
  });

  await step("invalid protocol", async () => {
    await assertRejects(
      () => urlToFilename(new URL("error:///example/abc/example.dll")),
      TypeError,
      "Don't know how to create cache name for protocol: error",
    );
  });
});

Deno.test("isFile", async ({ step }) => {
  await step("true", async () => {
    assert(await isFile("./util_test.ts"));
    assert(await isFile(fromFileUrl(import.meta.url)));
    assert(await isFile(fromFileUrl(new URL("mod.ts", import.meta.url))));
  });

  await step("false", async () => {
    assert(!await isFile("./this_file_does_not_exist"));
    assert(
      !await isFile(
        fromFileUrl(new URL("this_file_does_not_exist", import.meta.url)),
      ),
    );
  });
});

Deno.test("homeDir", async ({ step }) => {
  // Save a snapshot of `Deno.build`
  const build = structuredClone(Deno.build);
  const home = join(Deno.cwd(), "plug", "home");

  await step("windows", () => {
    // @ts-ignore TS2540
    Deno.build = { os: "windows" };
    Deno.env.set("USERPROFILE", home);

    assertEquals(homeDir(), home);

    Deno.env.delete("USERPROFILE");
  });

  for (const os of ["linux", "darwin"]) {
    await step(os, () => {
      // @ts-ignore TS2540
      Deno.build = { os };
      Deno.env.set("HOME", home);

      assertEquals(homeDir(), home);

      Deno.env.delete("HOME");
    });
  }
  await step("unreachable", () => {
    // @ts-ignore TS2540
    Deno.build = { os: "templeos" };
    assertThrows(() => homeDir(), Error, "unreachable");
  });
  // @ts-ignore TS2540
  // Restore the snapshot of `Deno.build`
  Deno.build = build;
});

Deno.test("cacheDir", async ({ step }) => {
  // Save a snapshot of `Deno.build`
  const build = structuredClone(Deno.build);
  const cache = join(Deno.cwd(), "plug", "cache");

  await step("windows", () => {
    // @ts-ignore TS2540
    Deno.build = { os: "windows" };
    Deno.env.set("LOCALAPPDATA", cache);

    const dir = cacheDir();
    assert(dir);
    assertEquals(dir, cache);

    Deno.env.delete("LOCALAPPDATA");
  });

  await step("darwin", () => {
    // @ts-ignore TS2540
    Deno.build = { os: "darwin" };
    Deno.env.set("HOME", cache);

    const dir = cacheDir();
    assert(dir);
    assertEquals(basename(dir), "Caches");
    assertEquals(basename(dirname(dir)), "Library");
    assertEquals(basename(dirname(dirname(dir))), "cache");
    assertEquals(basename(dirname(dirname(dirname(dir)))), "plug");

    Deno.env.delete("HOME");
  });

  await step("linux", async ({ step }) => {
    // @ts-ignore TS2540
    Deno.build = { os: "linux" };

    await step("XDG_CACHE_HOME", () => {
      Deno.env.set("XDG_CACHE_HOME", cache);

      const dir = cacheDir();
      assertEquals(dir, cache);

      Deno.env.delete("XDG_CACHE_HOME");
    });

    await step("HOME", () => {
      Deno.env.set("HOME", cache);

      const dir = cacheDir();
      assert(dir);
      assertEquals(basename(dir), ".cache");
      assertEquals(basename(dirname(dir)), "cache");
      assertEquals(basename(dirname(dirname(dir))), "plug");

      Deno.env.delete("HOME");
    });
  });

  await step("freebsd", async ({ step }) => {
    // @ts-ignore TS2540
    Deno.build = { os: "freebsd" };

    await step("XDG_CACHE_HOME", () => {
      Deno.env.set("XDG_CACHE_HOME", cache);

      const dir = cacheDir();
      assertEquals(dir, cache);

      Deno.env.delete("XDG_CACHE_HOME");
    });

    await step("HOME", () => {
      Deno.env.set("HOME", cache);

      const dir = cacheDir();
      assert(dir);
      assertEquals(basename(dir), ".cache");
      assertEquals(basename(dirname(dir)), "cache");
      assertEquals(basename(dirname(dirname(dir))), "plug");

      Deno.env.delete("HOME");
    });
  });

  await step("solaris", async ({ step }) => {
    // @ts-ignore TS2540
    Deno.build = { os: "solaris" };

    await step("XDG_CACHE_HOME", () => {
      Deno.env.set("XDG_CACHE_HOME", cache);

      const dir = cacheDir();
      assertEquals(dir, cache);

      Deno.env.delete("XDG_CACHE_HOME");
    });

    await step("HOME", () => {
      Deno.env.set("HOME", cache);

      const dir = cacheDir();
      assert(dir);
      assertEquals(basename(dir), ".cache");
      assertEquals(basename(dirname(dir)), "cache");
      assertEquals(basename(dirname(dirname(dir))), "plug");

      Deno.env.delete("HOME");
    });
  });

  await step("netbsd", async ({ step }) => {
    // @ts-ignore TS2540
    Deno.build = { os: "netbsd" };
    await step("XDG_CACHE_HOME", () => {
      Deno.env.set("XDG_CACHE_HOME", cache);

      const dir = cacheDir();
      assertEquals(dir, cache);

      Deno.env.delete("XDG_CACHE_HOME");
    });

    await step("HOME", () => {
      Deno.env.set("HOME", cache);

      const dir = cacheDir();
      assert(dir);
      assertEquals(basename(dir), ".cache");
      assertEquals(basename(dirname(dir)), "cache");
      assertEquals(basename(dirname(dirname(dir))), "plug");

      Deno.env.delete("HOME");
    });
  });

  await step("aix", async ({ step }) => {
    // @ts-ignore TS2540
    Deno.build = { os: "aix" };

    await step("XDG_CACHE_HOME", () => {
      Deno.env.set("XDG_CACHE_HOME", cache);

      const dir = cacheDir();
      assertEquals(dir, cache);

      Deno.env.delete("XDG_CACHE_HOME");
    });

    await step("HOME", () => {
      Deno.env.set("HOME", cache);

      const dir = cacheDir();
      assert(dir);
      assertEquals(basename(dir), ".cache");
      assertEquals(basename(dirname(dir)), "cache");
      assertEquals(basename(dirname(dirname(dir))), "plug");

      Deno.env.delete("HOME");
    });
  });

  await step("illumos", async ({ step }) => {
    // @ts-ignore TS2540
    Deno.build = { os: "illumos" };
    await step("XDG_CACHE_HOME", () => {
      Deno.env.set("XDG_CACHE_HOME", cache);

      const dir = cacheDir();
      assertEquals(dir, cache);

      Deno.env.delete("XDG_CACHE_HOME");
    });

    await step("HOME", () => {
      Deno.env.set("HOME", cache);

      const dir = cacheDir();
      assert(dir);
      assertEquals(basename(dir), ".cache");
      assertEquals(basename(dirname(dir)), "cache");
      assertEquals(basename(dirname(dirname(dir))), "plug");

      Deno.env.delete("HOME");
    });
  });

  // @ts-ignore TS2540
  // Restore the snapshot of `Deno.build`
  Deno.build = build;
});

Deno.test("denoCacheDir", async ({ step }) => {
  // Save a snapshot of `Deno.build`
  const build = structuredClone(Deno.build);
  // @ts-ignore TS2540
  Deno.build = { os: "linux" };

  await step("DENO_DIR", async ({ step }) => {
    await step("relative", () => {
      Deno.env.set("DENO_DIR", "./plug/cache/deno");

      const dir = denoCacheDir();
      assert(dir);
      assertEquals(dir, normalize(join(Deno.cwd(), "./plug/cache/deno")));

      Deno.env.delete("DENO_DIR");
    });

    await step("absolute", () => {
      Deno.env.set("DENO_DIR", "/plug/cache/deno");

      const dir = denoCacheDir();
      assert(dir);
      assertEquals(dir, normalize("/plug/cache/deno"));

      Deno.env.delete("DENO_DIR");
    });
  });

  await step("cacheDir", () => {
    const cache = join(Deno.cwd(), "plug");
    Deno.env.set("HOME", cache);

    const dir = denoCacheDir();
    assert(dir);
    assertEquals(basename(dir), "deno");
    assertEquals(basename(dirname(dir)), ".cache");
    assertEquals(basename(dirname(dirname(dir))), "plug");

    Deno.env.delete("HOME");
  });

  await step("homeDir", () => {
    // @ts-ignore TS2540
    Deno.build = { os: "windows" };

    const cache = join(Deno.cwd(), "plug");
    Deno.env.set("USERPROFILE", cache);

    const dir = denoCacheDir();
    assert(dir);
    assertEquals(basename(dir), ".deno");
    assertEquals(basename(dirname(dir)), "plug");

    Deno.env.delete("USERPROFILE");
  });

  await step("undefined", () => {
    // @ts-ignore TS2540
    Deno.build = { os: "linux" };

    const dir = denoCacheDir();
    assert(dir === undefined);
  });

  // @ts-ignore TS2540
  // Restore the snapshot of `Deno.build`
  Deno.build = build;
});
