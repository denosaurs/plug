import {
  assert,
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.157.0/testing/asserts.ts";
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
});
