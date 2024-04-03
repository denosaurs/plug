/**
 * Plug is a drop in extension for using remote dynamic libraries in deno. It
 * automatically handles caching and loading with minimal overhead. It can
 * automatically create the URL for your cross-operating-system, cross-architecture
 * libraries if you so wish using a simple configuration which deviates from
 * the standard URL/string path input.
 *
 * @example
 * ```ts
 * import { dlopen } from "@denosaurs/plug";
 *
 * // Drop-in replacement for `Deno.dlopen` which fetches the following depending
 * // on operating system:
 * // * darwin: "https://example.com/some/path/libexample.dylib"
 * // * windows: "https://example.com/some/path/example.dll"
 * // * linux: "https://example.com/some/path/libexample.so"
 * const library = await dlopen("https://example.com/some/path/", {
 *   noop: { parameters: [], result: "void" },
 * });
 *
 * library.symbols.noop();
 * ```
 *
 * @example
 * ```ts
 * import { dlopen, FetchOptions } from "@denosaurs/plug";
 *
 * // If you want plug to guess your binary names
 * const options: FetchOptions = {
 *   name: "example",
 *   url: "https://example.com/some/path/",
 *   // Becomes:
 *   // darwin: "https://example.com/some/path/libexample.dylib"
 *   // windows: "https://example.com/some/path/example.dll"
 *   // linux: "https://example.com/some/path/libexample.so"
 * };
 *
 * const library = await dlopen(options, {
 *   noop: { parameters: [], result: "void" },
 * });
 *
 * library.symbols.noop();
 * ```
 *
 * @example
 * ```ts
 * import { dlopen, FetchOptions } from "@denosaurs/plug";
 *
 * // Also you can specify the path for certain architecture
 * const options: FetchOptions = {
 *   name: "example",
 *   url: {
 *     darwin: {
 *       aarch64: `https://example.com/some/path/libexample.aarch64.dylib`,
 *       x86_64: `https://example.com/some/path/libexample.x86_64.dylib`,
 *     },
 *     windows: `https://example.com/some/path/example.dll`,
 *     linux: `https://example.com/some/path/libexample.so`,
 *   },
 * };
 *
 * await dlopen(options, {});
 * ```
 *
 * @example
 * ```ts
 * import { dlopen, FetchOptions } from "@denosaurs/plug";
 *
 * // Or even configure plug to automatically guess the binary names for you,
 * // even when there are special rules for naming on specific architectures
 * const options: FetchOptions = {
 *   name: "test",
 *   url: "https://example.com/some/path/",
 *   suffixes: {
 *     darwin: {
 *       aarch64: ".aarch64",
 *       x86_64: ".x86_64",
 *     },
 *   },
 *   // Becomes:
 *   // darwin-aarch64: "https://example.com/some/path/libexample.aarch64.dylib"
 *   // darwin-x86_64: "https://example.com/some/path/libexample.x86_64.dylib"
 * };
 *
 * await dlopen(options, {});
 * ```
 *
 * @module
 */

import { download } from "./download.ts";
import type { FetchOptions } from "./types.ts";

export type {
  ArchRecord,
  CacheLocation,
  CacheOptions,
  CacheSetting,
  CrossOptions,
  FetchOptions,
  NamedOptions,
  NestedCrossRecord,
  OsRecord,
  URLOptions,
} from "./types.ts";
export { download } from "./download.ts";

/* Magic types from deno which help implement better FFI type checking */
type Cast<A, B> = A extends B ? A : B;
type Const<T> = Cast<
  T,
  | (T extends string | number | bigint | boolean ? T : never)
  | { [K in keyof T]: Const<T[K]> }
  | []
>;

/**
 * Opens a dynamic library and registers symbols, compatible with
 * {@link Deno.dlopen} yet with extended functionality allowing you to use
 * remote (or local) binaries, automatically building the binary name and
 * controlling the caching policy.
 *
 * @example
 * ```ts
 * import { dlopen, FetchOptions } from "@denosaurs/plug";
 *
 * // Configure plug to automatically guess the binary names for you, even when
 * // there for example are special rules for naming on specific architectures
 * const options: FetchOptions = {
 *   name: "test",
 *   url: "https://example.com/some/path/",
 *   suffixes: {
 *     darwin: {
 *       aarch64: ".aarch64",
 *       x86_64: ".x86_64",
 *     },
 *   },
 *   // Becomes:
 *   // darwin-aarch64: "https://example.com/some/path/libexample.aarch64.dylib"
 *   // darwin-x86_64: "https://example.com/some/path/libexample.x86_64.dylib"
 * };
 *
 * await dlopen(options, {});
 * ```
 *
 * @param options See {@link FetchOptions}
 * @param symbols A record extending {@link Deno.ForeignLibraryInterface}
 * @returns An opened {@link Deno.DynamicLibrary}
 */
export async function dlopen<S extends Deno.ForeignLibraryInterface>(
  options: FetchOptions,
  symbols: Const<S>,
): Promise<Deno.DynamicLibrary<S>> {
  if (Deno.dlopen === undefined) {
    throw new Error("`--unstable-ffi` is required");
  }
  // deno-lint-ignore no-explicit-any
  return Deno.dlopen<S>(await download(options), symbols as any);
}
