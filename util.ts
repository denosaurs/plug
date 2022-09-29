import { hex, isAbsolute, join, normalize } from "./deps.ts";

export const encoder = new TextEncoder();
export const decoder = new TextDecoder();

function baseUrlToFilename(url: URL): string {
  const out = [];
  const protocol = url.protocol.replace(":", "");
  out.push(protocol);

  switch (protocol) {
    case "http":
    case "https": {
      const host = url.hostname;
      const hostPort = url.port;
      out.push(hostPort ? `${host}_PORT${hostPort}` : host);
      break;
    }
    case "file":
    case "data":
    case "blob":
      break;
    default:
      throw new TypeError(
        `Don't know how to create cache name for protocol: ${protocol}`,
      );
  }

  return join(...out);
}

export async function hash(value: string): Promise<string> {
  return decoder.decode(
    hex(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", encoder.encode(value)),
      ),
    ),
  );
}

export async function urlToFilename(url: URL): Promise<string> {
  const cacheFilename = baseUrlToFilename(url);
  const hashedFilename = await hash(url.pathname + url.search);
  return join(cacheFilename, hashedFilename);
}

export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await Deno.lstat(filePath);
    return stats.isFile;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
}

// The rest of is based on code from denoland/deno_cache by the Deno authors
// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

export function homeDir(): string | undefined {
  switch (Deno.build.os) {
    case "windows":
      Deno.permissions.request({ name: "env", variable: "USERPROFILE" });
      return Deno.env.get("USERPROFILE");
    case "linux":
    case "darwin":
      Deno.permissions.request({ name: "env", variable: "HOME" });
      return Deno.env.get("HOME");
    default:
      throw Error("unreachable");
  }
}

export function cacheDir(): string | undefined {
  if (Deno.build.os === "darwin") {
    const home = homeDir();
    if (home) {
      return join(home, "Library/Caches");
    }
  } else if (Deno.build.os === "linux") {
    Deno.permissions.request({ name: "env", variable: "XDG_CACHE_HOME" });
    const cacheHome = Deno.env.get("XDG_CACHE_HOME");
    if (cacheHome) {
      return cacheHome;
    } else {
      const home = homeDir();
      if (home) {
        return join(home, ".cache");
      }
    }
  } else {
    Deno.permissions.request({ name: "env", variable: "LOCALAPPDATA" });
    return Deno.env.get("LOCALAPPDATA");
  }
}

export function denoCacheDir() {
  Deno.permissions.request({ name: "env", variable: "DENO_DIR" });
  const dd = Deno.env.get("DENO_DIR");
  let root;
  if (dd) {
    root = normalize(isAbsolute(dd) ? dd : join(Deno.cwd(), dd));
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
