// Package Next's prerendered routes, public demo assets and real client chunks,
// plus the same extraction handler, as a portable Sites Worker.
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
const assets = {};
const mime = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};
async function add(file, url) {
  assets[url] = {
    type: mime[path.extname(file)] || "application/octet-stream",
    body: (await fs.readFile(file)).toString("base64"),
  };
}
async function walk(dir, prefix) {
  for (const f of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, f.name),
      url = prefix + "/" + f.name;
    if (f.isDirectory()) await walk(file, url);
    else if (!f.name.endsWith(".map")) await add(file, url);
  }
}
await add(".next/server/app/index.html", "/");
await walk(".next/static", "/_next/static");
await walk("public", "");
// Section routes need their own HTML for direct visits and auth redirects.
for(const section of ["outlook","journal","appointment-brief","privacy","settings","settings/privacy","welcome"]){
 const html=path.join(".next/server/app",section+".html");
 try{await add(html,"/"+section);}catch(error){if(error.code!=="ENOENT")throw error;}
}
await fs.mkdir("work", { recursive: true });
await fs.writeFile("work/assets.json", JSON.stringify(assets));
await fs.mkdir("dist/server", { recursive: true });
await build({
  entryPoints: ["worker/index.ts"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
});
console.log(
  `Packaged ${Object.keys(assets).length} Next.js assets and server extraction endpoint.`,
);
