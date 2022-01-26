import { assertCache, assertScript, cleanCache, server } from "./helpers.ts";

Deno.test({
  name: "remote | prepare",
  async fn(): Promise<void> {
    const address = "127.0.0.1:4500";
    const close = server(4500);

    await cleanCache();
    await assertScript("remote.ts", address);
    await assertCache();
    await assertScript("remote.ts", address);
    await assertCache();

    close();
  },
});

Deno.test({
  name: "local | prepare | relative",
  async fn(): Promise<void> {
    await cleanCache();
    await assertScript("local.ts");
    await assertCache();
    await assertScript("local.ts");
    await assertCache();
  },
});

Deno.test({
  name: "local | prepare | absolute",
  async fn(): Promise<void> {
    await cleanCache();
    await assertScript("abs.ts");
    await assertCache();
    await assertScript("abs.ts");
    await assertCache();
  },
});
