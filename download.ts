import {
  cacheDir,
  colors,
  ensureDir,
  extname,
  fromFileUrl,
  homeDir,
  isAbsolute,
  join,
  normalize,
} from "./deps.ts";
import {
  ArchRecord,
  CacheLocation,
  DownloadOptions,
  NestedCrossRecord,
  OsRecord,
} from "./types.ts";
import { isFile, urlToFilename } from "./util.ts";

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

function denoCacheDir() {
  Deno.permissions.request({ name: "env", variable: "DENO_DIR" });
  const dd = Deno.env.get("DENO_DIR");
  let root;
  if (dd) {
    if (!isAbsolute(dd)) {
      root = normalize(join(Deno.cwd(), dd));
    } else {
      root = dd;
    }
  } else {
    const cd = cacheDir();
    if (cd) {
      root = join(cd, "deno");
    } else {
      const hd = homeDir();
      if (hd) {
        root = join(hd, ".deno");
      }
    }
  }

  return root;
}

function getCrossOption<T>(
  record?: Partial<NestedCrossRecord<T>>,
) {
  if (record === undefined) {
    return;
  }

  if (
    "darwin" in record ||
    "linux" in record ||
    "windows" in record
  ) {
    const subrecord = record[Deno.build.os];

    if (
      typeof subrecord === "object" &&
      ("x86_64" in subrecord || "aarch64" in subrecord)
    ) {
      return (subrecord as ArchRecord<T>)[Deno.build.arch];
    } else {
      return subrecord;
    }
  }

  if (
    "x86_64" in record ||
    "aarch64" in record
  ) {
    const subrecord = record[Deno.build.arch];

    if (
      typeof subrecord === "object" && (
        "darwin" in subrecord ||
        "linux" in subrecord ||
        "windows" in subrecord
      )
    ) {
      return (subrecord as OsRecord<T>)[Deno.build.os];
    } else {
      return subrecord;
    }
  }
}

/**
 * Creates a cross-platform url for the specified options.
 *
 * @param options See {@link DownloadOptions}
 * @returns A fully specified url to the specified file
 */
export function createDownloadURL(options: DownloadOptions): URL {
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
  let url: URL;
  if (typeof options.url === "string" || options.url instanceof URL) {
    url = new URL(options.url);
  } else {
    const tmpUrl = getCrossOption(options.url);
    if (tmpUrl === undefined) {
      throw new TypeError(
        `An URL for the "${Deno.build.os}-${Deno.build.arch}" target was not provided.`,
      );
    }
    url = new URL(tmpUrl);
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
  } else if (typeof location === "string") {
    if (location.startsWith("file://")) {
      location = fromFileUrl(location);
    }
  } else {
    if (location?.protocol !== "file") {
      throw new TypeError(
        "Cannot use any other protocol than file:// for an URL cache location.",
      );
    }

    location = fromFileUrl(location);
  }

  location = normalize(location);
  await ensureDir(location);

  return location;
}

/**
 * Downloads a file using the specified {@link DownloadOptions}
 *
 * @param options See {@link DownloadOptions}
 * @returns The path to the downloaded file in its cached location
 */
export async function download(options: DownloadOptions): Promise<string> {
  const location =
    (typeof options === "object" && "location" in options
      ? options.location
      : undefined) ?? "deno";
  const setting =
    (typeof options === "object" && "cache" in options
      ? options.cache
      : undefined) ?? "use";
  const [url, directory] = await Promise.all([
    createDownloadURL(options),
    ensureCacheLocation(location),
  ]);
  const cacheBasePath = join(directory, await urlToFilename(url));
  const cacheFilePath = `${cacheBasePath}${extname(url.pathname)}`;
  const cacheMetaPath = `${cacheBasePath}.metadata.json`;
  const cached = setting === "use"
    ? await isFile(cacheFilePath)
    : setting === "only" || setting !== "reloadAll";

  if (!cached) {
    const meta = { url };
    switch (url.protocol) {
      case "http:":
      case "https:": {
        console.log(`${colors.green("Downloading")} ${url}`);
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

        const file = await Deno.create(cacheFilePath);
        await response.body!.pipeTo(file.writable);
        file.close();

        break;
      }

      case "file:": {
        console.log(`${colors.green("Copying")} ${url}`);
        await Deno.copyFile(fromFileUrl(url), cacheFilePath);
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

  if (!await isFile(cacheFilePath)) {
    throw new Error(`Could not find "${url}" in cache.`);
  }

  return cacheFilePath;
}
