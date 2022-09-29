import {
  assert,
  assertEquals,
  assertMatch,
  assertRejects,
  basename,
  dirname,
  normalize,
} from "./test_deps.ts";
import { createDownloadURL, ensureCacheLocation } from "./download.ts";

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
  await step("string", () => {
    const path = "./test/example";
    const result = createDownloadURL(path);
    assert(result.pathname.endsWith("/test/example"));
  });

  await step("URL", () => {
    const path = new URL("file://./test/example");
    const result = createDownloadURL(path);
    assertEquals(result, path);
  });

  await step("URLOptions", async ({ step }) => {
    await step("string", () => {
      const path = "./test/example";
      const result = createDownloadURL({ url: path });
      assert(result.pathname.endsWith("/test/example"));
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
      for (const arch of ["x86_64", "aarch64"]) {
        await step(arch, async ({ step }) => {
          //@ts-ignore TS2540
          Deno.build = { arch };
          const result = createDownloadURL({
            url: {
              [arch]: `test_${arch}`,
            },
          });
          assert(result.pathname.endsWith(`test_${arch}`));

          for (const os of ["darwin", "linux", "windows"]) {
            await step(os, () => {
              //@ts-ignore TS2540
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
      for (const os of ["darwin", "linux", "windows"]) {
        await step(os, async ({ step }) => {
          //@ts-ignore TS2540
          Deno.build = { os };
          const result = createDownloadURL({
            url: {
              [os]: `test_${os}`,
            },
          });
          assert(result.pathname.endsWith(`test_${os}`));

          for (const arch of ["x86_64", "aarch64"]) {
            await step(arch, () => {
              //@ts-ignore TS2540
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

    //@ts-ignore TS2540
    // Restore the snapshot of `Deno.build`
    Deno.build = build;
  });
});

Deno.test("ensureCacheLocation", async ({ step }) => {
  await step("deno", async () => {
    const location = await ensureCacheLocation("deno");
    assertEquals(basename(location), "plug");
    assertEquals(basename(dirname(location)), "deno");
    assert(await isDirectory(location));
  });

  await step("cwd", async () => {
    const location = await ensureCacheLocation("cwd");
    assertEquals(basename(location), "plug");
    assertEquals(normalize(dirname(location)), Deno.cwd());
    assert(await isDirectory(location));
  });

  await step("cache", async () => {
    const location = await ensureCacheLocation("cache");
    assertEquals(basename(location), "plug");
    assert(await isDirectory(location));
  });

  await step("tmp", async () => {
    const location = await ensureCacheLocation("tmp");
    assert(basename(location).startsWith("plug"));
    assert(await isDirectory(location));
  });

  await step("string", async () => {
    const location = await ensureCacheLocation("./plug/cache/");
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
