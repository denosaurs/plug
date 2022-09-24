import { HttpCache, join, cacheDir, homeDir, normalize, fromFileUrl, isAbsolute, ensureDir } from "./deps.ts";
import { CacheLocation } from "./types.ts";

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

/**
 * Return the path to the cache location along with ensuring its existance
 * 
 * @param location See the {@link CacheLocation} type
 * @returns The cache location path
 */
export async function ensureCacheLocation(location: CacheLocation = "deno") {
  if (location === "deno") {
    const dir = denoCacheDir();

    if (dir === undefined) {
      throw new Error("Could not get the deno cache directory, try using another CacheLocation in the plug options.")
    }

    location = join(dir, "plug");
  } else if (location === "cache") {
    const dir = cacheDir();

    if (dir === undefined) {
      throw new Error("Could not get the cache directory, try using another CacheLocation in the plug options.");
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
      throw new TypeError("Cannot use any other protocol than file:// for an URL cache location.");
    }

    location = fromFileUrl(location);
  }

  location = normalize(location);
  await ensureDir(location);

  return location;
}

/**
 * Creates a new HttpCache in the specified cache location
 * 
 * @param location See the {@link CacheLocation} type
 * @returns A {@link HttpCache}
 */
export async function createHttpCache(location?: CacheLocation): Promise<HttpCache> {
  return new HttpCache(await ensureCacheLocation(location));
}
