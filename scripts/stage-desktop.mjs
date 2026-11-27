import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("artifacts/desktop", { recursive: true });
await cp("desktop", "artifacts/desktop", { recursive: true });
await cp("dist", "artifacts/desktop/orbit", { recursive: true });
const path = "artifacts/desktop/orbit/index.html";
const index = await readFile(path, "utf8");
await writeFile(path, index.replace("<head>", '<head><meta name="orbit-bundled" content="desktop">'));
