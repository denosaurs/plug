import { cache } from "./cache.ts";
import {
  join,
  exists,
  createHash,
  extname,
  resolve,
  ensureDir,
} from "./deps.ts";

export interface CrossOptions {
  name: string;
  urls: { [os in typeof Deno.build.os]?: string };
  policy?: CachePolicy;
  cache?: string;
}

export interface SingleOptions {
  name: string;
  url: string;
  policy?: CachePolicy;
  cache?: string;
}

export type Options = CrossOptions | SingleOptions;

export enum CachePolicy {
  NONE,
  STORE,
}

interface UnstableCore {
  ops: () => { [key: string]: number };
  setAsyncHandler(rid: number, handler: (response: Uint8Array) => void): void;
  dispatch(
    rid: number,
    // deno-lint-ignore no-explicit-any
    msg: any,
    buf?: ArrayBufferView,
  ): Uint8Array | undefined;
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "PlugImportError";
    this.stack = undefined;
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).toString();
}

async function ensure(...paths: string[]): Promise<void> {
  await ensureDir(join(...paths));
}

async function fetchFile(url: string, path: string) {
  const protocol = url.split(":")[0];
  switch (protocol) {
    case "file":
      url = resolve(url.slice(7));
      if (!exists(url)) {
        throw new ImportError(`Plugin located at ${url} does not exist.`);
      }
      await Deno.copyFile(url, path);
      break;
    case "http":
    case "https": {
      const download = await fetch(url);

      if (!download.ok) {
        throw new ImportError(`Plugin download from ${url} failed.`);
      }

      const source = await download.arrayBuffer();
      await Deno.writeFile(path, new Uint8Array(source));
      break;
    }
    default:
      throw new ImportError(`"${protocol}" protocol is not supported.`);
  }
}

export async function prepare(options: Options): Promise<number> {
  const name = options.name;
  const policy = options.policy ?? CachePolicy.STORE;
  const dir = options.cache ?? cache();
  const pref = prefixes[os];
  const ext = extensions[os];

  let url;
  if ("urls" in options) {
    url = options.urls[os];
    if (!url) {
      throw new ImportError(`URL for "${os}" platform was not provided.`);
    }
  } else {
    url = options.url;
  }

  url = extname(url) !== ""
    ? url
    : `${url}${(url.endsWith("/") ? "" : "/")}${pref}${options.name}.${ext}`;

  const digest = hash(url);
  const path = join(dir, "plugins", `${name}_${digest}.${ext}`);

  ensure(dir, "plugins");

  if (policy == CachePolicy.NONE || !await exists(path)) {
    await fetchFile(url, path);
  }

  return Deno.openPlugin(path);
}

// deno-lint-ignore ban-ts-comment
// @ts-ignore
export const core = Deno.core as UnstableCore;
export const os = Deno.build.os;
export const extensions: { [os in typeof Deno.build.os]: string } = {
  darwin: "dylib",
  linux: "so",
  windows: "dll",
};
export const prefixes: { [os in typeof Deno.build.os]: string } = {
  darwin: "lib",
  linux: "lib",
  windows: "",
};
