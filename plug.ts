import {
  Cache,
  extname,
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

export async function prepare(options: Options): Promise<number> {
  const directory = options.cache ?? Cache.options.directory;
  const policy = options.policy === CachePolicy.NONE
    ? Cache.RELOAD_POLICY
    : undefined;
  Cache.configure({ directory });

  let url;
  if ("urls" in options) {
    url = options.urls[os];
    if (!url) {
      throw new PlugImportError(`URL for "${os}" platform was not provided.`);
    }
  } else {
    url = options.url;
  }

  const pref = prefixes[os];
  const ext = extensions[os];

  url = Object.values(extensions).includes(extname(url))
    ? url
    : `${url}${(url.endsWith("/") ? "" : "/")}${pref}${options.name}${ext}`;

  const plug = Cache.namespace("plug");
  const file = await plug.fetch(url, policy);

  // @ts-ignore
  return Deno.openPlugin(file.path);
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
  darwin: ".dylib",
  linux: ".so",
  windows: ".dll",
};
export const prefixes: { [os in typeof Deno.build.os]: string } = {
  darwin: "lib",
  linux: "lib",
  windows: "",
};
