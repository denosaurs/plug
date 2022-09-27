import { normalize } from "./deps.ts";
import { assertEquals } from "./test_deps.ts";
import { hash, urlToFilename } from "./util.ts";

Deno.test("hash", async () => {
  assertEquals(
    await hash("hello_world"),
    "35072c1ae546350e0bfa7ab11d49dc6f129e72ccd57ec7eb671225bbd197c8f1",
  );
});

Deno.test("urlToFilename", async ({ step }) => {
  await step("http", async () => {
    assertEquals(
      await urlToFilename(new URL("http://example.com/example.dll")),
      normalize(
        "http/example.com/59338ff59a9d830098ca938e773c9181f03cecb659c2e4ebb0f03e452ba7658a",
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
});
