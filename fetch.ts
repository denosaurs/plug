import { createHttpCache } from "./cache.ts";
import { AuthTokens, extname, fromFileUrl, HttpCache } from "./deps.ts";
import { ArchRecord, FetchOptions, OsRecord, CacheSetting } from "./types.ts";

export const defaultExtensions: OsRecord<string> = {
  darwin: "dylib",
  linux: "so",
  windows: "dll",
};

export const defaultPrefixes: OsRecord<string> = {
  darwin: "lib",
  linux: "lib",
  windows: "",
};

function createOsAffix(affix: OsRecord<string | ArchRecord<string>>): string {
  const subaffix = affix[Deno.build.os];

  if (typeof subaffix === "string") {
    return subaffix;
  } else {
    return subaffix[Deno.build.arch] ?? "";
  }
}

function createArchAffix(affix: ArchRecord<string | OsRecord<string>>): string {
  const subaffix = affix[Deno.build.arch];

  if (typeof subaffix === "string") {
    return subaffix;
  } else {
    return subaffix[Deno.build.os] ?? "";
  }
}

function createAffix(affix?: OsRecord<string | ArchRecord<string>> | ArchRecord<string | OsRecord<string>>): string {
  if (affix === undefined) {
    return "";
  }

  if (
    "darwin" in affix ||
    "linux" in affix ||
    "windows" in affix
  ) {
    return createOsAffix(affix);
  }

  if (
    "x86_64" in affix ||
    "aarch64" in affix
  ) {
    return createArchAffix(affix);
  }

  return "";
}

export function getFetchURL(options: FetchOptions): string {
  if (typeof options === "string" || options instanceof URL) {
    options = { url: options };
  }

  // Initialize default options
  options.extensions ??= defaultExtensions;
  options.prefixes ??= defaultPrefixes;

  // Clean extensions to not contain a leading dot
  for (const key in options.extensions) {
    const os = key as typeof Deno.build.os;
    if (options.extensions[os] !== undefined) {
      options.extensions[os] = options.extensions[os].replace(/.?(.+)/, "$1");
    }
  }

  // Get the os-specific url
  let url: string | URL;
  if (typeof options.url === "string" || options.url instanceof URL) {
    url = options.url;
  } else {
    const urls = options.url[Deno.build.os];
    if (urls === undefined) {
      throw new TypeError(
        `An URL for the "${Deno.build.os}" os was not provided.`,
      );
    }

    if (urls instanceof URL || typeof urls === "string") {
      url = urls;
    } else {
      const archUrl = urls[Deno.build.arch];

      if (archUrl === undefined) {
        throw new TypeError(
          `An URL for the "${Deno.build.os}-${Deno.build.arch}" target was not provided.`,
        );
      }

      url = archUrl;
    }
  }

  if (url instanceof URL) {
    url = url.toString();
  }

  // Assemble automatic cross-platform named urls here
  if ("name" in options && !Object.values(options.extensions).includes(extname(url))) {
    if (!url.endsWith("/")) {
      url = `${url}/`;
    }

    const prefix = createAffix(options.prefixes);
    const suffix = createAffix(options.suffixes);
    const extension = options.extensions[Deno.build.os];
    const filename = `${prefix}${options.name}${suffix}.${extension}`;

    url = new URL(filename, url).toString();
  }

  return url;
}

// The rest of this file is based on https://github.com/denoland/deno_cache/blob/main/file_fetcher.ts
// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// Copyright 2022 the denosaurs team. All rights reserved. MIT license.

function shouldUseCache(cacheSetting: CacheSetting, specifier: URL): boolean {
  switch (cacheSetting) {
    case "only":
    case "use":
      return true;
    case "reloadAll":
      return false;
    default: {
      const specifierStr = specifier.toString();
      for (const value of cacheSetting) {
        if (specifierStr.startsWith(value)) {
          return false;
        }
      }
      return true;
    }
  }
}

const SUPPORTED_SCHEMES = [
  "data:",
  "blob:",
  "file:",
  "http:",
  "https:",
] as const;

type SupportedSchemes = typeof SUPPORTED_SCHEMES[number];

function getValidatedScheme(specifier: URL) {
  const scheme = specifier.protocol;
  // deno-lint-ignore no-explicit-any
  if (!SUPPORTED_SCHEMES.includes(scheme as any)) {
    throw new TypeError(
      `Unsupported scheme "${scheme}" for module "${specifier.toString()}". Supported schemes: ${
        JSON.stringify(SUPPORTED_SCHEMES)
      }.`,
    );
  }
  return scheme as SupportedSchemes;
}

export function stripHashbang(value: string): string {
  return value.startsWith("#!") ? value.slice(value.indexOf("\n")) : value;
}

async function fetchLocal(specifier: URL): Promise<LoadResponse | undefined> {
  const local = fromFileUrl(specifier);
  if (!local) {
    throw new TypeError(
      `Invalid file path.\n  Specifier: ${specifier.toString()}`,
    );
  }
  try {
    const source = await Deno.readTextFile(local);
    const content = stripHashbang(source);
    return {
      kind: "module",
      content,
      specifier: specifier.toString(),
    };
  } catch {
    // ignoring errors, we will just return undefined
  }
}

const decoder = new TextDecoder();

export class FileFetcher {
  #allowRemote: boolean;
  #authTokens: AuthTokens;
  #cache = new Map<string, LoadResponse>();
  #cacheSetting: CacheSetting;
  #httpCache: HttpCache;

  constructor(
    httpCache: HttpCache,
    cacheSetting: CacheSetting = "use",
    allowRemote = true,
  ) {
    Deno.permissions.request({ name: "env", variable: "DENO_AUTH_TOKENS" });
    this.#authTokens = new AuthTokens(Deno.env.get("DENO_AUTH_TOKENS"));
    this.#allowRemote = allowRemote;
    this.#cacheSetting = cacheSetting;
    this.#httpCache = httpCache;
  }

  async #fetchBlobDataUrl(specifier: URL): Promise<LoadResponse> {
    const cached = await this.#fetchCached(specifier, 0);
    if (cached) {
      return cached;
    }

    if (this.#cacheSetting === "only") {
      throw new Deno.errors.NotFound(
        `Specifier not found in cache: "${specifier.toString()}", --cached-only is specified.`,
      );
    }

    const response = await fetch(specifier.toString());
    const content = await response.text();
    const headers: Record<string, string> = {};
    for (const [key, value] of response.headers) {
      headers[key.toLowerCase()] = value;
    }
    await this.#httpCache.set(specifier, headers, content);
    return {
      kind: "module",
      specifier: specifier.toString(),
      headers,
      content,
    };
  }

  async #fetchCached(
    specifier: URL,
    redirectLimit: number,
  ): Promise<LoadResponse | undefined> {
    if (redirectLimit < 0) {
      throw new Deno.errors.Http("Too many redirects");
    }

    const cached = await this.#httpCache.get(specifier);
    if (!cached) {
      return undefined;
    }
    const [file, headers] = cached;
    const location = headers["location"];
    if (location) {
      const redirect = new URL(location, specifier);
      file.close();
      return this.#fetchCached(redirect, redirectLimit - 1);
    }
    const bytes = await readAll(file);
    file.close();
    const content = decoder.decode(bytes);
    return {
      kind: "module",
      specifier: specifier.toString(),
      headers,
      content,
    };
  }

  async #fetchRemote(
    specifier: URL,
    redirectLimit: number,
  ): Promise<LoadResponse | undefined> {
    if (redirectLimit < 0) {
      throw new Deno.errors.Http("Too many redirects.");
    }

    if (shouldUseCache(this.#cacheSetting, specifier)) {
      const response = await this.#fetchCached(specifier, redirectLimit);
      if (response) {
        return response;
      }
    }

    if (this.#cacheSetting === "only") {
      throw new Deno.errors.NotFound(
        `Specifier not found in cache: "${specifier.toString()}", --cached-only is specified.`,
      );
    }

    const requestHeaders = new Headers();
    const cached = await this.#httpCache.get(specifier);
    if (cached) {
      const [file, cachedHeaders] = cached;
      file.close();
      if (cachedHeaders["etag"]) {
        requestHeaders.append("if-none-match", cachedHeaders["etag"]);
      }
    }
    const authToken = this.#authTokens.get(specifier);
    if (authToken) {
      requestHeaders.append("authorization", authToken);
    }
    console.log(`${colors.green("Download")} ${specifier.toString()}`);
    const response = await fetch(specifier.toString(), {
      headers: requestHeaders,
    });
    if (!response.ok) {
      if (response.status === 404) {
        return undefined;
      } else {
        throw new Deno.errors.Http(`${response.status} ${response.statusText}`);
      }
    }
    // WHATWG fetch follows redirects automatically, so we will try to
    // determine if that ocurred and cache the value.
    if (specifier.toString() !== response.url) {
      const headers = { "location": response.url };
      await this.#httpCache.set(specifier, headers, "");
    }
    const url = new URL(response.url);
    const content = await response.text();
    const headers: Record<string, string> = {};
    for (const [key, value] of response.headers) {
      headers[key.toLowerCase()] = value;
    }
    await this.#httpCache.set(url, headers, content);
    return {
      kind: "module",
      specifier: response.url,
      headers,
      content,
    };
  }

  async fetch(specifier: URL): Promise<LoadResponse | undefined> {
    const scheme = getValidatedScheme(specifier);
    const response = this.#cache.get(specifier.toString());
    if (response) {
      return response;
    } else if (scheme === "file:") {
      return fetchLocal(specifier);
    } else if (scheme === "data:" || scheme === "blob:") {
      const response = await this.#fetchBlobDataUrl(specifier);
      this.#cache.set(specifier.toString(), response);
      return response;
    } else if (!this.#allowRemote) {
      throw new Deno.errors.PermissionDenied(
        `A remote specifier was requested: "${specifier.toString()}", but --no-remote is specifier`,
      );
    } else {
      const response = await this.#fetchRemote(specifier, 10);
      if (response) {
        this.#cache.set(specifier.toString(), response);
      }
      return response;
    }
  }
}
