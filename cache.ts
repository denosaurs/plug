import { resolve, join, ensureDir } from "./deps.ts";

const POSIX_HOME = "HOME";

export function cache(): string {
  const env = Deno.env.get;
  const os = Deno.build.os;

  const deno = env("DENO_DIR");

  if (deno) return resolve(deno);

  let home: string | undefined;
  let path: string;
  switch (os) {
    case "linux": {
      const xdg = env("XDG_CACHE_HOME");
      home = xdg ?? env(POSIX_HOME);
      path = xdg ? "deno" : join(".cache", "deno");
      break;
    }
    case "darwin":
      home = env(POSIX_HOME);
      path = join("Library", "Caches", "deno");
      break;

    case "windows":
      home = env("LOCALAPPDATA");
      home = home ?? env("USERPROFILE");
      path = "deno";
      break;
  }

  path = home ? path : ".deno";
  if (!home) return path; // relative cache path
  return resolve(join(home, path)); // system cache path
}

export function tmp(): string {
  const env = Deno.env.get;
  const os = Deno.build.os;

  let tmp = env("TMPDIR");
  if (tmp) return resolve(tmp);
  tmp = env("TEMP");
  if (tmp) return resolve(tmp);
  tmp = env("TMP");
  if (tmp) return resolve(tmp);

  switch (os) {
    case "linux":
    case "darwin":
      return resolve("/tmp");

    case "windows":
      return resolve("C:\\TEMP");
  }
}
