/**
 * This module contains the common types used in plug.
 *
 * @module
 */

/**
 * A record keyed by possible operating system identifiers
 */
export type OsRecord<T> = { [os in typeof Deno.build.os]: T };
/**
 * A record keyed by possible system architecture identifiers
 */
export type ArchRecord<T> = { [os in typeof Deno.build.arch]: T };
/**
 * An optionally nested record of either an {@link OsRecord} or
 * {@link ArchRecord} containing either the generic T or the opposite record
 * type from the parent. That way we can query for the record entry of a target
 * keyed by both an architecture and operating system in the ordered entered in
 * this record.
 */
export type NestedCrossRecord<T> = Partial<
  | OsRecord<T | Partial<ArchRecord<T>>>
  | ArchRecord<T | Partial<OsRecord<T>>>
>;

/**
 * Where the plug cache is stored:
 *
 * | Option  | Description                                                                               |
 * | ------- | ----------------------------------------------------------------------------------------- |
 * | `deno`  | The location of the default deno cache, this is the default option.                       |
 * | `cwd`   | A `plug` folder in the current working directory.                                         |
 * | `cache` | A `plug` folder in default cache directory for the current os.                            |
 * | `tmp`   | A temporary `plug` prefixed folder in the default temporary directory for the current os. |
 * | string  | A file path pointing to the folder where the plug cache should be stored.                 |
 * | URL     | A file protocol URL pointing to the folder where the plug cache should be stored.         |
 */
export type CacheLocation = "deno" | "cwd" | "cache" | "tmp" | string | URL;

/** A setting that determines how the cache is handled for remote dependencies.
 *
 * | Option      | Description                                                                                                  |
 * | ----------- | ------------------------------------------------------------------------------------------------------------ |
 * | `use`       | The cache will be used, meaning existing remote files will not be reloaded, this is the default option.      |
 * | `only`      | Only the cache will be re-used, and any remote files not in the cache will error.                            |
 * | `reloadAll` | Any cached modules will be ignored and their values will be fetched.                                         |
 */
export type CacheSetting = "use" | "only" | "reloadAll";

/**
 * Options for controlling how plug caches files
 */
export interface CacheOptions {
  /**
   * The location where plug should cache the fetched file
   */
  location?: CacheLocation;
  /**
   * The cache policy plug should use, see {@link CacheSetting}
   */
  cache?: CacheSetting;
}

/**
 * Options for using a single url as the source for either creating a
 * {@link NamedOptions named url} or using it simply as is if the platforms
 * extension is specified or no name is specified.
 */
export interface URLOptions {
  /**
   * The url to either a dynamic library or its directory if {@link NamedOptions named}
   */
  url: string | URL;
}

/**
 * Options for fetching cross-platform urls.
 */
export interface CrossOptions {
  /**
   * See {@link NestedCrossRecord}, basically a record optionally keyed by
   * either or operating-system and architecture letting us get the correct
   * url for fetching the right file for the platform.
   */
  url: NestedCrossRecord<string | URL>;
}

/**
 * Options used for automatically assembling an os and arch specific file name
 */
export interface NamedOptions {
  /**
   * The base name of the library.
   *
   * ```
   * libplug.x86_64.dll
   *    ^^^^
   * ```
   */
  name: string;

  /**
   * A {@link OsRecord} containing the extensions for the respective
   * operating-systems. By default this is `.so` for linux, freebsd, netbsd, aix, solaris and illumos, `.dylib` for darwin
   * and `.dll` for windows.
   *
   * ```
   * libplug.x86_64.dll
   *                ^^^
   * ```
   */
  extensions?: OsRecord<string>;
  /**
   * A {@link NestedCrossRecord} containing the prefixes for the respective
   * operating-systems and architectures. By default this is `lib` for all
   * architectures on linux, darwin, freebsd, netbsd, aix, solaris and illumos and empty for windows.
   *
   * ```
   * libplug.x86_64.dll
   * ^^^
   * ```
   */
  prefixes?: NestedCrossRecord<string>;
  /**
   * A {@link NestedCrossRecord} containing the suffixes for the respective
   * operating-systems and architectures. By default this is empty for all
   * architectures and operating-systems. An idea would be to use this to
   * automatically select the suffix for the correct architecture.
   *
   * ```
   * libplug.x86_64.dll
   *        ^^^^^^^
   * ```
   */
  suffixes?: NestedCrossRecord<string>;
}

/**
 * Options for fetching files (usually being dynamic libraries, but could
 * possibly also be other dependencies) using plug. This can be either a
 * string or an URL. All urls in plug can be either local or remote. If it is
 * not an string or URL it can be some combination of the following options:
 *
 * * {@link URLOptions} or {@link CrossOptions} for controlling the source url
 * * {@link NamedOptions} for automatically creating cross-platform binary names
 * * {@link CacheOptions} for controlling the cache behaviour
 */
export type FetchOptions =
  | string
  | URL
  | ((((URLOptions | CrossOptions) & Partial<NamedOptions>)) & CacheOptions);
