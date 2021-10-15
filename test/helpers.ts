import { Plug } from "../mod.ts";
import {
  assert,
  assertEquals,
  Cache,
  dirname,
  exists,
  fromFileUrl,
  join,
  resolve,
  serve,
  serveFile,
} from "../test_deps.ts";

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

  const lib = await Plug.prepare(options, {
    test_sync: { parameters: [], result: "i8" },
  });

  const response = lib.symbols.test_sync();

  assertEquals(response, 1);
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
      "--allow-ffi",
      "--allow-net",
      "--unstable",
      script,
      ...args,
    ],
    stderr: "inherit",
    stdout: "inherit",
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
  Cache.configure({
    directory: resolveTest("cache"),
  });
  await Cache.purge("plug");
}
