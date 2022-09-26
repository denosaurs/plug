import { assert, assertEquals, assertMatch } from "./test_deps.ts";
import { createDownloadURL } from "./download.ts";

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
