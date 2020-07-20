import { Plug } from "../mod.ts";
import {
  assertEquals,
  serve,
  serveFile,
  resolve,
  dirname,
  fromFileUrl,
  join,
  assert,
  exists,
} from "../test_deps.ts";

const decoder = new TextDecoder();

export async function run(path: string) {
  const options: Plug.Options = {
    name: "test_plugin",
    urls: {
      darwin: `${path}/libtest_plugin.dylib`,
      windows: `${path}/test_plugin.dll`,
      linux: `${path}/libtest_plugin.so`,
    },
    cache: resolveTest("cache"),
  };

  const rid = await Plug.prepare(options);

  const { testSync } = Plug.core.ops();
  const response = Plug.core.dispatch(
    testSync,
    new Uint8Array([116, 101, 115, 116]),
    new Uint8Array([116, 101, 115, 116]),
  )!;

  assertEquals(decoder.decode(response), "test");

  Deno.close(rid);
}

export function server(address: string) {
  const server = serve(address);

  (async () => {
    for await (const request of server) {
      console.log(request.url);
      const response = await serveFile(
        request,
        resolve(`.${request.url}`),
      );
      await request.respond(response);
    }
  })();

  return server;
}

export function resolveTest(...path: string[]) {
  const dir = dirname(fromFileUrl(import.meta.url));
  return resolve(join(dir, ...path));
}

export async function assertScript(
  script: string,
  ...args: string[]
): Promise<void> {
  script = resolveTest(script);
  const process = Deno.run({
    cmd: [
      "deno",
      "run",
      "--allow-read",
      "--allow-write",
      "--allow-plugin",
      "--allow-net",
      "--unstable",
      script,
      ...args,
    ],
  });
  const status = await process.status();
  process.close();
  assert(status.success);
}

export async function assertCache(): Promise<void> {
  const cache = resolveTest("cache");
  assert(await exists(cache));

  const files = [];
  for (const _ of Deno.readDirSync(cache)) {
    files.push(_);
  }

  assert(files.length > 0);
}

export async function cleanCache() {
  await Deno.remove(resolveTest("cache"), { recursive: true });
}
