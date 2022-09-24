import type { CacheSetting } from "./deps.ts";

export type { CacheSetting } from "./deps.ts";

export type OsRecord<T> = { [os in typeof Deno.build.os]: T };
export type ArchRecord<T> = { [os in typeof Deno.build.arch]: T };

/**
 * Where the plug cache is stored:
 * 
 * | Option  | Description                                                                              |
 * | ------- | ---------------------------------------------------------------------------------------- |
 * | `deno`  | The location of the default deno cache, this is the default option                       |
 * | `cwd`   | A `plug` folder in the current working directory                                         |
 * | `cache` | A `plug` folder in default cache directory for the current os                            |
 * | `tmp`   | A temporary `plug` prefixed folder in the default temporary directory for the current os |
 * | string  | A file path pointing to the folder where the plug cache should be stored                 |
 * | URL     | A file protocol URL pointing to the folder where the plug cache should be stored         |
 */
export type CacheLocation = "deno" | "cwd" | "cache" | "tmp" | string | URL;

export interface CacheOptions {
  location?: CacheLocation;
  cache?: CacheSetting | boolean;
}

export interface URLOptions {
  url: string | URL;
}

export interface CrossOptions {
  url: Partial<OsRecord<(string | URL) | Partial<ArchRecord<string | URL>>>>;
}

/**
 * Options used for automatically assembling an os and arch specific file name.
 */
export interface NamedOptions {
  /** The base name of the library */
  name: string;

  extensions?: OsRecord<string>;
  prefixes?: OsRecord<string | ArchRecord<string>> | ArchRecord<string | OsRecord<string>>;
  suffixes?: OsRecord<string | ArchRecord<string>> | ArchRecord<string | OsRecord<string>>;
}

export type FetchOptions = string | URL | ((((URLOptions | CrossOptions) & Partial<NamedOptions>)) & CacheOptions);
