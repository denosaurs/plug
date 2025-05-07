/**
 * This module contains the common types used in plug.
 *
 * @module
 */

import {
  dirname,
  extname,
  fromFileUrl,
  join,
  normalize,
  resolve,
} from "@std/path";
import { ensureDir } from "@std/fs";
import { green } from "@std/fmt/colors";
import type {
  ArchRecord,
  CacheLocation,
  FetchOptions,
  NestedCrossRecord,
  OsRecord,
} from "./types.ts";
import {
  cacheDir,
  denoCacheDir,
  isFile,
  stringToURL,
  urlToFilename,
} from "./util.ts";

/**
 * A list of all possible system architectures.
 *
 * This should match the {@link Deno.build.arch} type.
 */
export const ALL_ARCHS: (typeof Deno.build.arch)[] = ["x86_64", "aarch64"];

/**
 * A list of all possible system operating systems.
 *
 * This should match the {@link Deno.build.os} type.
 */
export const ALL_OSS: (typeof Deno.build.os)[] = [
  "darwin",
  "linux",
  "android",
  "windows",
  "freebsd",
  "netbsd",
  "aix",
  "solaris",
  "illumos",
];

/**
 * The default file extensions for dynamic libraries in the different operating
 * systems.
 */
export const defaultExtensions: OsRecord<string> = {
  darwin: "dylib",
  linux: "so",
  windows: "dll",
  freebsd: "so",
  netbsd: "so",
  aix: "so",
  solaris: "so",
  illumos: "so",
  android: "so",
};

/**
 * The default file prefixes for dynamic libraries in the different operating
 * systems.
 */
export const defaultPrefixes: OsRecord<string> = {
  darwin: "lib",
  linux: "lib",
  netbsd: "lib",
  freebsd: "lib",
  aix: "lib",
  solaris: "lib",
  illumos: "lib",
  windows: "",
  android: "lib",
};

function getCrossOption<T>(record?: NestedCrossRecord<T>): T | undefined {
  if (record === undefined) {
    return;
  }

  if (ALL_OSS.some((os) => os in record)) {
    const subrecord = (record as OsRecord<T>)[Deno.build.os];

    if (
      subrecord &&
      typeof subrecord === "object" &&
      ALL_ARCHS.some((arch) => arch in subrecord)
    ) {
      return (subrecord as ArchRecord<T>)[Deno.build.arch];
    } else {
      return subrecord as T;
    }
  }

  if (ALL_ARCHS.some((arch) => arch in record)) {
    const subrecord = (record as ArchRecord<T>)[Deno.build.arch];

    if (
      subrecord &&
      typeof subrecord === "object" &&
      ALL_OSS.some((os) => os in subrecord)
    ) {
      return (subrecord as OsRecord<T>)[Deno.build.os];
    } else {
      return subrecord as T;
    }
  }
}

/**
 * Creates a cross-platform url for the specified options
 *
 * @param options See {@link FetchOptions}
 * @returns A fully specified url to the specified file
 */
export function createDownloadURL(options: FetchOptions): URL {
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
      options.extensions[os] = options.extensions[os].replace(/\.?(.+)/, "$1");
    }
  }

  // Get the os-specific url
  let url: URL;
  if (options.url instanceof URL) {
    url = options.url;
  } else if (typeof options.url === "string") {
    url = stringToURL(options.url);
  } else {
    const tmpUrl = getCrossOption(options.url);
    if (tmpUrl === undefined) {
      throw new TypeError(
        `An URL for the "${Deno.build.os}-${Deno.build.arch}" target was not provided.`,
      );
    }

    if (typeof tmpUrl === "string") {
      url = stringToURL(tmpUrl);
    } else {
      url = tmpUrl;
    }
  }

  // Assemble automatic cross-platform named urls here
  if (
    "name" in options &&
    !Object.values(options.extensions).includes(extname(url.pathname))
  ) {
    if (!url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
    }

    const prefix = getCrossOption(options.prefixes) ?? "";
    const suffix = getCrossOption(options.suffixes) ?? "";
    const extension = options.extensions[Deno.build.os];

    if (options.name === undefined) {
      throw new TypeError(
        `Expected the "name" property for an automatically assembled URL.`,
      );
    }

    const filename = `${prefix}${options.name}${suffix}.${extension}`;

    url = new URL(filename, url);
  }

  return url;
}

/**
 * Return the path to the cache location along with ensuring its existance
 *
 * @param location See the {@link CacheLocation} type
 * @returns The cache location path
 */
export async function ensureCacheLocation(
  location: CacheLocation = "deno",
): Promise<string> {
  if (location === "deno") {
    const dir = denoCacheDir();

    if (dir === undefined) {
      throw new Error(
        "Could not get the deno cache directory, try using another CacheLocation in the plug options.",
      );
    }

    location = join(dir, "plug");
  } else if (location === "cache") {
    const dir = cacheDir();

    if (dir === undefined) {
      throw new Error(
        "Could not get the cache directory, try using another CacheLocation in the plug options.",
      );
    }

    location = join(dir, "plug");
  } else if (location === "cwd") {
    location = join(Deno.cwd(), "plug");
  } else if (location === "tmp") {
    location = await Deno.makeTempDir({ prefix: "plug" });
  } else if (typeof location === "string" && location.startsWith("file://")) {
    location = fromFileUrl(location);
  } else if (location instanceof URL) {
    if (location?.protocol !== "file:") {
      throw new TypeError(
        "Cannot use any other protocol than file:// for an URL cache location.",
      );
    }

    location = fromFileUrl(location);
  }

  location = resolve(normalize(location));

  await ensureDir(location);

  return location;
}

/**
 * Downloads a file using the specified {@link FetchOptions}
 *
 * @param options See {@link FetchOptions}
 * @returns The path to the downloaded file in its cached location
 */
export async function download(options: FetchOptions): Promise<string> {
  const location =
    (typeof options === "object" && "location" in options
      ? options.location
      : undefined) ?? "deno";
  const setting =
    (typeof options === "object" && "cache" in options
      ? options.cache
      : undefined) ?? "use";
  const url = createDownloadURL(options);
  const directory = await ensureCacheLocation(location);
  const cacheBasePath = join(directory, await urlToFilename(url));
  const cacheFilePath = `${cacheBasePath}${extname(url.pathname)}`;
  const cacheMetaPath = `${cacheBasePath}.metadata.json`;
  const cached = setting === "use"
    ? await isFile(cacheFilePath)
    : setting === "only" || setting !== "reloadAll";

  await ensureDir(dirname(cacheBasePath));

  if (!cached) {
    const meta = { url };
    switch (url.protocol) {
      case "http:":
      case "https:": {
        console.log(`${green("Downloading")} ${url}`);
        const response = await fetch(url.toString());

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Could not find ${url}`);
          } else {
            throw new Deno.errors.Http(
              `${response.status} ${response.statusText}`,
            );
          }
        }

        await Deno.writeFile(
          cacheFilePath,
          new Uint8Array(await response.arrayBuffer()),
        );
        break;
      }

      case "file:": {
        console.log(`${green("Copying")} ${url}`);
        await Deno.copyFile(fromFileUrl(url), cacheFilePath);
        if (Deno.build.os !== "windows") {
          await Deno.chmod(cacheFilePath, 0o644);
        }
        break;
      }

      default: {
        throw new TypeError(
          `Cannot fetch to cache using the "${url.protocol}" protocol`,
        );
      }
    }
    await Deno.writeTextFile(cacheMetaPath, JSON.stringify(meta));
  }

  if (!(await isFile(cacheFilePath))) {
    throw new Error(`Could not find "${url}" in cache.`);
  }

  return cacheFilePath;
}
