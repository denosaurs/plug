import { createHttpCache } from "./cache.ts";
import { extname } from "./deps.ts";
import { ArchRecord, FetchOptions, OsRecord } from "./types.ts";

// deno-lint-ignore require-await
export async function dlopen<S extends Deno.ForeignLibraryInterface>(
  options: FetchOptions,
  symbols: S,
): Promise<Deno.DynamicLibrary<S>> {
  const filename = "";
  return Deno.dlopen(filename, symbols);
}
