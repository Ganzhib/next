import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("backend-dist", { recursive: true });
for (const name of ["index", "cli"])
  await build({
    entryPoints: [`server/${name}.ts`],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    outfile: `backend-dist/${name}.cjs`,
    external: ["pg-native"],
    logLevel: "info",
  });
