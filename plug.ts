import { cache } from "./cache.ts";
import {
  join,
  exists,
  createHash,
  extname,
  ensureDir
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

export class PlugError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "PlugError";
    this.stack = undefined;
  }
}

export class PlugImportError extends Error {
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

async function fetchFile(url: URL, path: string) {
  const protocol = url.protocol.slice(0, -1);
  switch (protocol) {
    case "file":
      const ospath = join(url.host, url.pathname);
      console.log(ospath);
      if (!await exists(ospath)) {
        throw new PlugImportError(`Plugin located at "${ospath}" does not exist.`);
      }
      await Deno.copyFile(ospath, path);
      break;
    case "http":
    case "https": {
      const download = await fetch(url);

      if (!download.ok) {
        throw new PlugImportError(`Plugin download from "${url}" failed.`);
      }

      const source = await download.arrayBuffer();
      await Deno.writeFile(path, new Uint8Array(source));
      break;
    }
    default:
      throw new PlugImportError(`"${protocol}" protocol is not supported.`);
  }
}

export async function prepare(options: Options): Promise<number> {
  const name = options.name;
  const policy = options.policy ?? CachePolicy.STORE;
  const dir = options.cache ?? cache();
  const ext = extensions[os];

  let url;
  if ("urls" in options) {
    url = options.urls[os];
    if (!url) {
      throw new PlugImportError(`URL for "${os}" platform was not provided.`);
    }
  } else {
    url = options.url;
  }

  url = new URL(url);

  const digest = hash(url.href);
  const path = join(dir, "plug", `${name}_${digest}.${ext}`);

  ensure(dir, "plug");

  if (policy === CachePolicy.NONE || !await exists(path)) {
    await fetchFile(url, path);
  }

  return Deno.openPlugin(path);
}

export function getOpId(op: string): number {
  const id = core.ops()[op];

  if (!(id > 0)) {
    throw new PlugError(`Bad op id for "${op}"`);
  }

  return id;
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
