/**
 * Plug is a drop in extension for using remote dynamic libraries in deno. It
 * automatically handles caching and loading with minimal overhead. It can
 * automatically create the URL for your cross-platform, cross-architecture
 * libraries if you so wish using a simple configuration which deviates from
 * the standard URL/string path input.
 *
 * @module
 */

import { download } from "./download.ts";
import { DownloadOptions } from "./types.ts";

export { download } from "./download.ts";

export async function dlopen<S extends Deno.ForeignLibraryInterface>(
  options: DownloadOptions,
  symbols: S,
): Promise<Deno.DynamicLibrary<S>> {
  return Deno.dlopen(await download(options), symbols);
}
