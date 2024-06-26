import {
  assert,
  assertEquals,
  assertMatch,
  assertRejects,
} from "jsr:@std/assert";
import { basename, dirname, normalize } from "@std/path";

import { createDownloadURL, ensureCacheLocation } from "./download.ts";

const ALL_ARCHS = ["x86_64", "aarch64"];

const ALL_OSS = [
  "darwin",
  "linux",
  "windows",
  "freebsd",
  "netbsd",
  "aix",
  "solaris",
  "illumos",
];

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await Deno.lstat(filePath);
    return stats.isDirectory;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
}

Deno.test("createDownloadURL", async ({ step }) => {
  await step("string", async ({ step }) => {
    await step("relative", () => {
      const path = "./test/example";
      const result = createDownloadURL(path);
      assertEquals(
        result.toString(),
        new URL("./test/example", import.meta.url).toString(),
      );
    });

    await step("file", () => {
      const path = "file:///test/example";
      const result = createDownloadURL(path);
      assertEquals(result.toString(), "file:///test/example");
    });

    await step("http", () => {
      const path = "http://example.com/example";
      const result = createDownloadURL(path);
      assertEquals(result.toString(), "http://example.com/example");
    });

    await step("https", () => {
      const path = "https://example.com/example";
      const result = createDownloadURL(path);
      assertEquals(result.toString(), "https://example.com/example");
    });
  });

  await step("URL", async ({ step }) => {
    await step("file", () => {
      const path = new URL("file:///test/example");
      const result = createDownloadURL(path);
      assertEquals(result.toString(), "file:///test/example");
    });

    await step("http", () => {
      const path = new URL("http://example.com/example");
      const result = createDownloadURL(path);
      assertEquals(result.toString(), "http://example.com/example");
    });

    await step("https", () => {
      const path = new URL("https://example.com/example");
      const result = createDownloadURL(path);
      assertEquals(result.toString(), "https://example.com/example");
    });
  });

  await step("URLOptions", async ({ step }) => {
    await step("string", () => {
      const path = "./test/example";
      const result = createDownloadURL({ url: path });
      assertEquals(
        result.toString(),
        new URL("./test/example", import.meta.url).toString(),
      );
    });

    await step("URL", () => {
      const path = new URL("file://./test/example");
      const result = createDownloadURL({ url: path });
      assertEquals(result, path);
    });
  });

  await step("NamedOptions", async ({ step }) => {
    await step("URLOptions", async ({ step }) => {
      await step("string", () => {
        const path = "./test/example/";
        const result = createDownloadURL({ url: path, name: "test" });
        assertMatch(result.pathname, /.*(lib)?test.(dll|so|dylib)$/);
      });

      await step("URL", () => {
        const path = new URL("file://./test/example/");
        const result = createDownloadURL({ url: path, name: "test" });
        assertMatch(result.pathname, /.*(lib)?test.(dll|so|dylib)$/);
      });
    });
  });

  await step("CrossOptions", async ({ step }) => {
    // Save a snapshot of `Deno.build`
    const build = structuredClone(Deno.build);

    await step("arch", async ({ step }) => {
      for (const arch of ALL_ARCHS) {
        await step(arch, async ({ step }) => {
          // @ts-ignore TS2540
          Deno.build = { arch };
          const result = createDownloadURL({
            url: {
              [arch]: `test_${arch}`,
            },
          });
          assert(result.pathname.endsWith(`test_${arch}`));

          for (const os of ALL_OSS) {
            await step(os, () => {
              // @ts-ignore TS2540
              Deno.build = {
                arch,
                os,
              };
              const result = createDownloadURL({
                url: {
                  [arch]: {
                    [os]: `test_${arch}_${os}`,
                  },
                },
              });
              assert(result.pathname.endsWith(`test_${arch}_${os}`));
            });
          }
        });
      }
    });

    await step("os", async ({ step }) => {
      Deno.build.os;
      for (const os of ALL_OSS) {
        await step(os, async ({ step }) => {
          // @ts-ignore TS2540
          Deno.build = { os };
          const result = createDownloadURL({
            url: {
              [os]: `test_${os}`,
            },
          });
          assert(result.pathname.endsWith(`test_${os}`));

          for (const arch of ALL_ARCHS) {
            await step(arch, () => {
              // @ts-ignore TS2540
              Deno.build = {
                arch,
                os,
              };
              const result = createDownloadURL({
                url: {
                  [os]: {
                    [arch]: `test_${os}_${arch}`,
                  },
                },
              });
              assert(result.pathname.endsWith(`test_${os}_${arch}`));
            });
          }
        });
      }
    });

    // @ts-ignore TS2540
    // Restore the snapshot of `Deno.build`
    Deno.build = build;
  });
});

Deno.test("ensureCacheLocation", async ({ step }) => {
  await step("deno", async ({ step }) => {
    const location = await ensureCacheLocation("deno");
    assertEquals(basename(location), "plug");
    assertEquals(basename(dirname(location)), "deno");
    assert(await isDirectory(location));

    await step("missing", async () => {
      // Save a snapshot of `Deno.build`
      const build = structuredClone(Deno.build);
      const HOME = Deno.env.get("HOME");
      const DENO_DIR = Deno.env.get("DENO_DIR");
      // @ts-ignore TS2540
      Deno.build = { os: "linux" };
      Deno.env.delete("HOME");
      Deno.env.delete("DENO_DIR");

      await assertRejects(
        () => ensureCacheLocation("deno"),
        Error,
        "Could not get the deno cache directory, try using another CacheLocation in the plug options.",
      );

      // @ts-ignore TS2540
      // Restore the snapshot of `Deno.build`
      Deno.build = build;
      if (HOME) Deno.env.set("HOME", HOME);
      if (DENO_DIR) Deno.env.set("DENO_DIR", DENO_DIR);
    });
  });

  await step("cwd", async () => {
    const location = await ensureCacheLocation("cwd");
    assertEquals(basename(location), "plug");
    assertEquals(normalize(dirname(location)), Deno.cwd());
    assert(await isDirectory(location));
  });

  await step("cache", async ({ step }) => {
    const location = await ensureCacheLocation("cache");
    assertEquals(basename(location), "plug");
    assert(await isDirectory(location));

    await step("missing", async () => {
      // Save a snapshot of `Deno.build`
      const build = structuredClone(Deno.build);
      const HOME = Deno.env.get("HOME");
      const XDG_CACHE_HOME = Deno.env.get("XDG_CACHE_HOME");
      // @ts-ignore TS2540
      Deno.build = { os: "linux" };
      Deno.env.delete("HOME");
      Deno.env.delete("XDG_CACHE_HOME");

      await assertRejects(
        () => ensureCacheLocation("cache"),
        Error,
        "Could not get the cache directory, try using another CacheLocation in the plug options.",
      );

      // @ts-ignore TS2540
      // Restore the snapshot of `Deno.build`
      Deno.build = build;
      if (HOME) Deno.env.set("HOME", HOME);
      if (XDG_CACHE_HOME) Deno.env.set("XDG_CACHE_HOME", XDG_CACHE_HOME);
    });
  });

  await step("tmp", async () => {
    const location = await ensureCacheLocation("tmp");
    assert(basename(location).startsWith("plug"));
    assert(await isDirectory(location));
  });

  await step("path string", async () => {
    const location = await ensureCacheLocation("./plug/cache/");
    assertEquals(basename(location), "cache");
    assertEquals(basename(dirname(location)), "plug");
    assertEquals(normalize(dirname(dirname(location))), Deno.cwd());
    assert(await isDirectory(location));
  });

  await step("file string", async () => {
    const location = await ensureCacheLocation(
      new URL("./plug/cache/", import.meta.url).href,
    );
    assertEquals(basename(location), "cache");
    assertEquals(basename(dirname(location)), "plug");
    assertEquals(normalize(dirname(dirname(location))), Deno.cwd());
    assert(await isDirectory(location));
  });

  await step("URL", async () => {
    const location = await ensureCacheLocation(
      new URL("./plug/cache/url", import.meta.url),
    );
    assertEquals(basename(location), "url");
    assertEquals(basename(dirname(location)), "cache");
    assertEquals(basename(dirname(dirname(location))), "plug");
    assertEquals(normalize(dirname(dirname(dirname(location)))), Deno.cwd());
    assert(await isDirectory(location));
  });

  await step("invalid protocol", async () => {
    await assertRejects(
      () => ensureCacheLocation(new URL("https://example.com/")),
      TypeError,
      "Cannot use any other protocol than file:// for an URL cache location.",
    );
  });
});
