import { hex, join, parse, fromFileUrl } from "./deps.ts";

export const encoder = new TextEncoder();
export const decoder = new TextDecoder();

export async function hash(value: string): Promise<string> {
  return decoder.decode(
    hex(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", encoder.encode(value)),
      ),
    ),
  );
}

export function baseUrlToFilename(url: URL): string {
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

export async function urlToFilename(url: URL): Promise<string> {
  const cacheFilename = baseUrlToFilename(url);

  let restStr = url.pathname;
  const query = url.search;
  if (query) {
    restStr += `?${query}`;
  }
  const hashedFilename = await hash(restStr);
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
