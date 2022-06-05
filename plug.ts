import { Cache, extname, green } from "./deps.ts";

export type ArchUrls = {
  [arch in typeof Deno.build.arch]?: string;
};

export interface CrossOptions {
  name: string;
  urls: { [os in typeof Deno.build.os]?: string | ArchUrls };
  policy?: CachePolicy;
  cache?: string;
  log?: boolean;
}

export interface UrlOptions {
  url: string;
  policy?: CachePolicy;
  cache?: string;
  log?: boolean;
}

export interface SingleOptions {
  name: string;
  url: string;
  policy?: CachePolicy;
  cache?: string;
  log?: boolean;
}

export type Options = string | UrlOptions | CrossOptions | SingleOptions;

export type CachePolicy = "NONE" | "STORE";
export const CachePolicy = {
  NONE: "NONE",
  STORE: "STORE",
} as const;

export const os = Deno.build.os;
export const arch = Deno.build.arch;
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

export async function download(options: Options): Promise<string> {
  if (typeof options === "string") {
    options = { url: options };
  }

  const directory = options.cache ?? Cache.options.directory;
  const policy = options.policy === CachePolicy.NONE
    ? Cache.RELOAD_POLICY
    : undefined;
  Cache.configure({ directory });

  let url;
  if ("urls" in options) {
    url = options.urls[os];
    if (url !== undefined && typeof url !== "string") {
      url = url[arch];
    }

    if (!url) {
      throw new PlugImportError(
        `URL for "${arch}-${os}" platform was not provided.`,
      );
    }
  } else {
    url = options.url;
  }

  const pref = prefixes[os];
  const ext = extensions[os];

  if ("name" in options && !Object.values(extensions).includes(extname(url))) {
    url = `${url}${(url.endsWith("/") ? "" : "/")}${pref}${options.name}${ext}`;
  }

  const plug = Cache.namespace("plug");
  if ((options.log ?? true) && !(await plug.exists(url))) {
    console.log(`${green("Download")} ${url}`);
  }
  const file = await plug.cache(url, policy);

  return file.path;
}

export async function prepare<S extends Record<string, Deno.ForeignFunction>>(
  options: Options,
  symbols: S,
): Promise<Deno.DynamicLibrary<S>> {
  const file = await download(options);
  return Deno.dlopen(file, symbols);
}
