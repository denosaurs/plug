export type OsRecord<T> = { [os in typeof Deno.build.os]: T };
export type ArchRecord<T> = { [os in typeof Deno.build.arch]: T };
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

export interface CacheOptions {
  location?: CacheLocation;
  cache?: CacheSetting;
}

export interface URLOptions {
  url: string | URL;
}

export interface CrossOptions {
  url: NestedCrossRecord<string | URL>;
}

/**
 * Options used for automatically assembling an os and arch specific file name.
 */
export interface NamedOptions {
  /** The base name of the library */
  name: string;

  extensions?: OsRecord<string>;
  prefixes?: NestedCrossRecord<string>;
  suffixes?: NestedCrossRecord<string>;
}

export type DownloadOptions =
  | string
  | URL
  | ((((URLOptions | CrossOptions) & Partial<NamedOptions>)) & CacheOptions);
