import { assert } from "../test_deps.ts";
import { run } from "./helpers.ts";

const address = Deno.args[0];
assert(address && address.length > 0, "no address");

await run(`http://${address}/test_ffi/target/debug`);
