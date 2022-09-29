/**
 * Plug is a drop in extension for using remote dynamic libraries in deno. It
 * automatically handles caching and loading with minimal overhead. It can
 * automatically create the URL for your cross-operating-system, cross-architecture
 * libraries if you so wish using a simple configuration which deviates from
 * the standard URL/string path input.
 *
 * @module
 */

import { download } from "./download.ts";
import { FetchOptions } from "./types.ts";

export { download } from "./download.ts";

/**
 * Opens a dynamic library and registers symbols, compatible with
 * {@link Deno.dlopen} yet with extended functionality allowing you to use
 * remote (or local) binaries, automatically building the binary name and
 * controlling the caching policy.
 *
 * @param options See {@link FetchOptions}
 * @param symbols A record extending {@link Deno.ForeignLibraryInterface}
 * @returns An opened {@link Deno.DynamicLibrary}
 */
export async function dlopen<S extends Deno.ForeignLibraryInterface>(
  options: FetchOptions,
  symbols: S,
): Promise<Deno.DynamicLibrary<S>> {
  return Deno.dlopen(await download(options), symbols);
}
