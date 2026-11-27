import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("artifacts/android-assets", { recursive: true });
await cp("dist", "artifacts/android-assets/orbit", { recursive: true });
const path = "artifacts/android-assets/orbit/index.html";
const index = await readFile(path, "utf8");
await writeFile(path, index.replace("<head>", '<head><meta name="orbit-bundled" content="android">'));
