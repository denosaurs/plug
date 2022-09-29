import {
  assert,
  assertEquals,
  assertRejects,
  fromFileUrl,
  normalize,
} from "./test_deps.ts";
import { hash, isFile, urlToFilename } from "./util.ts";

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
