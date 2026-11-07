import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (full.endsWith(".js")) out.push(full);
  }
  return out;
}
const files = [...await walk("src"), ...await walk("data"), ...await walk("scripts"), "server.js"];
for (const file of files) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
console.log(`Sintaxis JavaScript correcta: ${files.length} archivos.`);
try {
  const pugModule = await import("pug");
  const pug = pugModule.default;
  const templates = (await walk("views")).filter((file) => file.endsWith(".pug"));
  for (const file of templates) pug.compileFile(file);
  console.log(`Plantillas Pug compiladas correctamente: ${templates.length}.`);
} catch (error) {
  if (error.code === "ERR_MODULE_NOT_FOUND") console.warn("Pug no está instalado todavía; la compilación de vistas se ejecutará después de npm install.");
  else throw error;
}
