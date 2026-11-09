/** Strukturelle und semantische OpenAPI-Prüfungen ohne festgeschriebene fachliche Erwartungen. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test, { after } from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';

const verzeichnis = fileURLToPath(new URL('../', import.meta.url));
const quellen = join(verzeichnis, 'spezifikation');
const einstieg = join(quellen, 'openapi.yaml');
const cli = join(verzeichnis, 'node_modules/@redocly/cli/bin/cli.js');
const lesen = (datei) => parse(readFileSync(datei, 'utf8'), { uniqueKeys: true });
// Tests verwenden stets die aktuellen Quellen, unabhängig von lokalen Build-Dateien.
const temporaer = mkdtempSync(join(tmpdir(), 'domaenenmodell-'));
const gesamtdatei = join(temporaer, 'openapi.yaml');
after(() => rmSync(temporaer, { recursive: true, force: true }));
let dokument;
try {
  redocly('bundle', 'spezifikation/openapi.yaml', '--output', gesamtdatei,
    '--component-renaming-conflicts-severity', 'error');
  dokument = lesen(gesamtdatei);
} catch (fehler) {
  rmSync(temporaer, { recursive: true, force: true });
  throw fehler;
}

function* knoten(wert, pointer = '') {
  if (wert === null || typeof wert !== 'object') return;
  if (!Array.isArray(wert)) yield [pointer, wert];
  for (const [name, kind] of Object.entries(wert)) {
    if (name === 'example' || name === 'examples') continue;
    const segment = name.replaceAll('~', '~0').replaceAll('/', '~1');
    yield* knoten(kind, `${pointer}/${segment}`);
  }
}

function nachschlagen(wurzel, fragment) {
  assert.ok(fragment === '' || fragment.startsWith('#/'), `Kein JSON-Pointer: ${fragment}`);
  if (fragment === '') return wurzel;
  let wert = wurzel;
  for (const segment of decodeURIComponent(fragment.slice(2)).split('/')) {
    const name = segment.replaceAll('~1', '/').replaceAll('~0', '~');
    assert.ok(wert !== null && typeof wert === 'object' && Object.hasOwn(wert, name),
      `Nicht auflösbare Referenz: ${fragment}`);
    wert = wert[name];
  }
  return wert;
}

const objekte = [...knoten(dokument)];
// OpenAPI-Metadaten sind zulässige Annotationen; Daten werden nicht verändert.
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv, { mode: 'full' });
const uri = 'urn:domaenenmodell:vertrag';
ajv.addSchema(dokument, uri);
const validator = (name) => ajv.getSchema(`${uri}#/components/schemas/${name}`);
function gueltig(pruefen, wert, ort = '') {
  assert.equal(pruefen(wert), true, `${ort}: ${ajv.errorsText(pruefen.errors)}`);
}
function redocly(...argumente) {
  return execFileSync(process.execPath, [cli, ...argumente], {
    cwd: verzeichnis, encoding: 'utf8', timeout: 30_000, stdio: 'pipe',
  });
}

// Beide Darstellungen werden unabhängig auf OpenAPI-Struktur und Referenzen geprüft.
test('openapi_vertrag', () => redocly('lint', gesamtdatei));
test('quellen_sind_gueltiger_openapi_vertrag', () => redocly('lint', 'spezifikation/openapi.yaml'));

test('alle_schemas_lassen_sich_validieren_und_kompilieren', () => {
  for (const name of Object.keys(dokument.components.schemas)) {
    assert.equal(typeof validator(name), 'function', name);
  }
  for (const [pointer, objekt] of objekte) {
    if (Object.hasOwn(objekt, 'schema')) {
      assert.equal(typeof ajv.getSchema(uri + '#' + pointer + '/schema'), 'function', pointer);
    }
  }
});

test('referenzen_sind_lokal_und_aufloesbar', () => {
  for (const [pointer, objekt] of objekte) {
    if (!Object.hasOwn(objekt, '$ref')) continue;
    assert.ok(objekt.$ref.startsWith('#/'), `${pointer}: ${objekt.$ref}`);
    nachschlagen(dokument, objekt.$ref);
  }
});

test('beispiele_erfuellen_ihre_schemas', () => {
  for (const [pointer, objekt] of objekte) {
    if (Array.isArray(objekt.examples)) {
      for (const wert of objekt.examples) gueltig(ajv.getSchema(uri + '#' + pointer), wert, pointer);
    }
    if (!Object.hasOwn(objekt, 'schema')) continue;
    const pruefen = ajv.getSchema(uri + '#' + pointer + '/schema');
    if (Object.hasOwn(objekt, 'example')) gueltig(pruefen, objekt.example, pointer);
    for (const [name, eintrag] of Object.entries(objekt.examples ?? {})) {
      const beispiel = eintrag.$ref ? nachschlagen(dokument, eintrag.$ref) : eintrag;
      assert.ok(!Object.hasOwn(beispiel, 'externalValue'), `${pointer}: Externes Beispiel ${name}`);
      if (Object.hasOwn(beispiel, 'value')) gueltig(pruefen, beispiel.value, `${pointer}/${name}`);
    }
  }
});

function* quelldateien(ort) {
  for (const eintrag of readdirSync(ort, { withFileTypes: true })) {
    const datei = join(ort, eintrag.name);
    if (eintrag.isDirectory()) yield* quelldateien(datei);
    else if (eintrag.name.endsWith('.yaml')) yield datei;
  }
}

test('quellreferenzen_bleiben_im_quellverzeichnis_und_sind_aufloesbar', () => {
  const dokumente = new Map([...quelldateien(quellen)].map((datei) => [datei, lesen(datei)]));
  for (const [datei, inhalt] of dokumente) {
    for (const [pointer, objekt] of knoten(inhalt)) {
      if (!Object.hasOwn(objekt, '$ref')) continue;
      const ref = objekt.$ref;
      assert.ok(!/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref), `${pointer}: ${ref}`);
      assert.ok(!isAbsolute(decodeURIComponent(ref.split('#')[0])), ref);
      const ziel_url = new URL(ref, pathToFileURL(datei));
      assert.equal(ziel_url.protocol, 'file:');
      assert.equal(ziel_url.search, '');
      const ziel = fileURLToPath(ziel_url);
      const abstand = relative(quellen, realpathSync(ziel));
      assert.ok(abstand !== '..' && !abstand.startsWith('..' + sep) && !isAbsolute(abstand), ref);
      assert.ok(dokumente.has(ziel), `${datei}: ${ref}`);
      if (datei !== einstieg) assert.notEqual(ziel, einstieg, 'Bausteine dürfen nicht auf den Einstieg zurückverweisen.');
      nachschlagen(dokumente.get(ziel), ziel_url.hash);
    }
  }
});

test('doppelte_schluessel_werden_abgewiesen', () => {
  assert.throws(() => parse('name: eins\nname: zwei\n', { uniqueKeys: true }), { code: 'DUPLICATE_KEY' });
});
