import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const EDITOR_CSS_PATH = new URL("../src/editor/editor.css", import.meta.url);
const EDITOR_HTML_PATH = new URL("../editor.html", import.meta.url);
const SHARED_CSS_PATH = new URL("../src/styles.css", import.meta.url);

function declarationsFor(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `No se encontró el selector ${selector}`);
  return match[1];
}

test("la marca del Editor puede encogerse sin invadir las estadísticas", async () => {
  const css = await readFile(EDITOR_CSS_PATH, "utf8");
  const brandContent = declarationsFor(css, ".editor-brand > div");

  assert.match(brandContent, /\bflex\s*:\s*1\s+1\s+auto\s*;/);
  assert.match(brandContent, /\bmin-width\s*:\s*0\s*;/);
  assert.match(brandContent, /\boverflow\s*:\s*hidden\s*;/);
});

test("el título compartido reserva espacio para descendentes sin perder la elipsis", async () => {
  const css = await readFile(SHARED_CSS_PATH, "utf8");
  const title = declarationsFor(css, ".hud-brand h1");

  assert.match(title, /\bpadding-block\s*:\s*0\.04em\s+0\.12em\s*;/);
  assert.match(title, /\boverflow\s*:\s*hidden\s*;/);
  assert.match(title, /\btext-overflow\s*:\s*ellipsis\s*;/);
  assert.match(title, /\bwhite-space\s*:\s*nowrap\s*;/);
});

test("la cabecera conserva sus cortes responsive alrededor del ancho reproducido", async () => {
  const css = await readFile(EDITOR_CSS_PATH, "utf8");

  assert.match(
    css,
    /@media\s*\(max-width:\s*1120px\)[\s\S]*?\.editor-brand \.eyebrow\s*,\s*\.editor-brand \.mode-entry-label\s*\{\s*display:\s*none\s*;/,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*1120px\)[\s\S]*?\.editor-brand \.mode-entry-link\s*\{[\s\S]*?min-width:\s*2rem\s*;[\s\S]*?justify-content:\s*center\s*;/,
  );
  assert.doesNotMatch(
    css,
    /@media\s*\(max-width:\s*1120px\)[\s\S]*?\.editor-brand \.mode-entry-link\s*\{\s*display:\s*none\s*;/,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*820px\)[\s\S]*?\.editor-stats\s*\{\s*display:\s*none\s*;/,
  );
});

test("el dock editorial contiene Bowerbird expandido y conserva BW al minimizar", async () => {
  const [css, editor] = await Promise.all([
    readFile(EDITOR_CSS_PATH, "utf8"),
    readFile(EDITOR_HTML_PATH, "utf8"),
  ]);
  const shell = declarationsFor(css, ".editor-shell");
  const collapsedButton = declarationsFor(css, ".editor-dock.is-collapsed .dock-button");
  const generalWidth = Number(shell.match(/--editor-general-width:\s*([\d.]+)rem\s*;/)?.[1]);
  const toolsWidth = Number(shell.match(/--editor-tools-width:\s*([\d.]+)rem\s*;/)?.[1]);

  assert.ok(Number.isFinite(generalWidth));
  assert.ok(Number.isFinite(toolsWidth));
  assert.ok(
    toolsWidth >= 8.75,
    `El dock editorial (${toolsWidth}rem) debe conservar el mínimo que contiene Bowerbird.`,
  );
  assert.ok(
    toolsWidth >= generalWidth,
    `El dock editorial (${toolsWidth}rem) no debe ser más estrecho que General (${generalWidth}rem).`,
  );
  assert.match(
    editor,
    /id="editor-open-bowerbird"[\s\S]*?data-mark="BW"[\s\S]*?>Bowerbird<\/button>/,
  );
  assert.match(collapsedButton, /\boverflow\s*:\s*hidden\s*;/);
  assert.match(collapsedButton, /\bfont-size\s*:\s*0\s*;/);
  assert.match(css, /\.editor-dock\.is-collapsed \.dock-button::before\s*\{[\s\S]*?font-size:\s*0\.65rem\s*;/);
});
