/** Vertragstests für OpenAPI-Quellen, Gesamtdatei und fachliche Beispiele. */
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
function ungueltig(pruefen, wert, ort = '') {
  assert.equal(pruefen(wert), false, `${ort}: Unerwartet gültig: ${JSON.stringify(wert)}`);
}
function parameter(operation) {
  return (operation.parameters ?? []).map((p) => p.$ref ? nachschlagen(dokument, p.$ref) : p);
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

test('kontakt_anlage_grenzen_und_pflichtangaben', () => {
  const basis = {
    kontakt_am: '2026-10-20T09:00:00Z', kanal: 'chat', status: 'erledigt', betreff: 'Rückfrage',
    bemerkung: 'Das Anliegen wurde besprochen.', maschinell_erzeugt: true,
    externe_id: 'kundenportal:gespraech-001',
  };
  const pruefen = validator('kontakt_anlage');
  gueltig(pruefen, basis);
  const manuell = { ...basis, maschinell_erzeugt: false };
  delete manuell.externe_id;
  gueltig(pruefen, manuell);
  gueltig(pruefen, { ...basis, externe_id: 'a'.repeat(64) });
  for (const status of ['erledigt', 'in_bearbeitung', 'storniert']) gueltig(pruefen, { ...basis, status });
  gueltig(pruefen, { ...basis, betreff: 'Ä'.repeat(120), bemerkung: '🙂'.repeat(2400) });
  const aenderungen = [
    { betreff: 'a'.repeat(121) }, { bemerkung: 'a'.repeat(2401) }, { bemerkung: '  ' },
    { kanal: 'Chat Bot' }, { kontakt_am: '2026-10-20T09:00:00' },
    { kontakt_am: '2026-02-30T09:00:00Z' }, { status: 'erfasst' },
    { person_id: 'andere-person' }, { richtung: null }, { externe_id: 'a'.repeat(65) },
    { externe_id: { id: '001' } }, { externe_id: '' },
  ];
  for (const aenderung of aenderungen) ungueltig(pruefen, { ...basis, ...aenderung });
  for (const name of Object.keys(basis)) {
    const fall = { ...basis };
    delete fall[name];
    ungueltig(pruefen, fall, `Fehlendes Pflichtfeld: ${name}`);
  }
});

test('idempotenzschluessel_format', () => {
  const pruefen = validator('idempotenzschluessel');
  const schluessel = '06a37d58-d26f-4ee6-9b26-41ff8bea57a1';
  gueltig(pruefen, schluessel);
  for (const wert of ['', 'beliebig', schluessel.toUpperCase(), '"' + schluessel + '"',
    '06a37d58-d26f-1ee6-9b26-41ff8bea57a1']) ungueltig(pruefen, wert);
});

test('personenkennungen_nach_nummernart', () => {
  const pruefen = validator('identifikator');
  for (const [art, wert] of [
    ['kvnr', 'A123456789'],
    ['rvnr', '65170839J003'],
    ['partnernummer', '000123456789'],
  ]) gueltig(pruefen, { art, wert });
  for (const [art, wert] of [
    ['kvnr', 'a123456789'],
    ['kvnr', 'A12345678'],
    ['rvnr', '65170839j003'],
    ['rvnr', '651708390003'],
    ['rvnr', '65170839J00'],
    ['partnernummer', ''], ['partnernummer', '000 123'],
    ['krankenversicherungsnummer', 'A123456789'], ['rentenversicherungsnummer', '65170839J003'],
  ]) ungueltig(pruefen, { art, wert });
});

test('kontaktantworten_und_seitengrenze', () => {
  const pruefen = validator('kontaktliste');
  const kontakt = { id: 'kontakt-001', kontakt_am: '2026-10-20T09:00:00Z' };
  gueltig(pruefen, { data: [] });
  gueltig(pruefen, { data: Array(100).fill(kontakt) });
  gueltig(pruefen, { data: [{ ...kontakt, zusaetzliches_feld: 'erlaubt', externe_id: 'portal:001', archiviert: true }] });
  gueltig(validator('kontakt'), { id: 'kontakt-ohne-zeit' });
  for (const wert of [{}, { data: Array(101).fill(kontakt) },
    { data: [{ kontakt_am: '2026-10-20T09:00:00Z' }] }, { data: [], naechster_versatz: -1 }]) {
    ungueltig(pruefen, wert);
  }
});

test('aufgabe_anlage_grenzen', () => {
  const pruefen = validator('aufgabe_anlage');
  const basis = { aufgabendefinitionsname: 'Allgemeine Bearbeitung' };
  gueltig(pruefen, basis);
  gueltig(pruefen, { ...basis, info: 'a'.repeat(50), bemerkung: 'a'.repeat(2000),
    vorgangsnotiz: 'a'.repeat(1200), wiedervorlagedatum: '2026-11-10' });
  ungueltig(pruefen, {});
  for (const aenderung of [{ info: 'a'.repeat(51) }, { bemerkung: 'a'.repeat(2001) },
    { vorgangsnotiz: 'a'.repeat(1201) }, { aufgabendefinitionsname: 'a'.repeat(121) },
    { wiedervorlagedatum: '2026-02-30' }, { wiedervorlagedatum: '2026-11-10T09:00:00Z' },
    { person_id: 'andere-person' }, { status: 'erledigt' }, { bearbeiter_id: 'anderer-bearbeiter' }]) {
    ungueltig(pruefen, { ...basis, ...aenderung });
  }
});

test('aufgabenliste_ist_personenweit', () => {
  const pruefen = validator('aufgabenliste');
  gueltig(pruefen, { data: [] });
  gueltig(pruefen, { data: [
    { id: 'aufgabe-001', bearbeiter_id: 'mitarbeiter-001' },
    { id: 'aufgabe-002', bearbeiter_id: 'mitarbeiter-002' }, { id: 'aufgabe-003' },
  ] });
  const operation = dokument.paths['/personen/{person_id}/aufgaben'].get;
  assert.ok(!parameter(operation).some((p) => p.name === 'bearbeiter_id'));
  gueltig(pruefen, { data: Array(100).fill({ id: 'aufgabe-001' }) });
  for (const wert of [{}, { data: Array(101).fill({ id: 'aufgabe-001' }) },
    { data: [], naechster_versatz: 0 }]) ungueltig(pruefen, wert);
});

test('personenangaben_unbekannt_und_leer', () => {
  const person = validator('person');
  gueltig(person, { id: 'person-001' });
  gueltig(person, { id: 'person-001', betreuungshinweise: [] });
  ungueltig(person, { id: 'person-001', betreuungshinweise: true });
  ungueltig(person, { id: 'person-001', betreuungshinweise: [{}] });
  gueltig(validator('adresse'), { id: 'adresse-001', art: 'zustelladresse', postfach: '123' });
  ungueltig(validator('adresse'), { id: 'adresse-001', art: 'ferienadresse' });
  gueltig(validator('kontaktdatum'), { id: 'kontaktdatum-001', art: 'mobil', wert: '+49 170 0000000' });
});

test('schreiboperation_hat_idempotenzparameter', () => {
  for (const pfad of ['/personen/{person_id}/kontakte', '/personen/{person_id}/aufgaben']) {
    const operation = dokument.paths[pfad].post;
    const p = parameter(operation).find((p) => p.name === 'Idempotency-Key');
    assert.equal(p.in, 'header');
    assert.equal(p.required, true);
  }
});

test('kontosaldo_betraege_und_pflichtangaben', () => {
  const pruefen = validator('kontosaldo');
  const basis = { betrag: '0.00', waehrung: 'EUR', stichtag: '2026-11-07' };
  for (const betrag of ['0.00', '0.01', '-0.01', '125.50', '-125.50', '9999999999999.99']) {
    gueltig(pruefen, { ...basis, betrag });
  }
  for (const betrag of [0, 125.50, null, '-0.00', '+1.00', '01.00', '1', '1.0', '1.001',
    '1,00', '1e2', ' 1.00', '1.00\n']) ungueltig(pruefen, { ...basis, betrag });
  for (const feld of Object.keys(basis)) {
    const fall = { ...basis }; delete fall[feld]; ungueltig(pruefen, fall);
  }
  for (const aenderung of [{ waehrung: 'USD' }, { stichtag: '2026-02-30' },
    { stichtag: '2026-11-07T09:00:00Z' }]) ungueltig(pruefen, { ...basis, ...aenderung });
});

test('zahlungskonten_fehlender_saldo_ist_keine_null', () => {
  const pruefen = validator('zahlungskontenliste');
  const konto = { id: 'konto-001', kontonummer: '000123',
    saldo: { betrag: '0.00', waehrung: 'EUR', stichtag: '2026-11-07' } };
  gueltig(pruefen, { data: [] });
  gueltig(pruefen, { data: [konto, { ...konto, id: 'konto-002', kontonummer: '000124' }] });
  gueltig(pruefen, { data: [{ ...konto, zusaetzliches_feld: 'erlaubt' }] });
  for (const feld of Object.keys(konto)) {
    const fall = { ...konto }; delete fall[feld]; ungueltig(pruefen, { data: [fall] });
  }
  for (const fall of [{}, { data: null }, { data: [{ ...konto, saldo: null }] },
    { data: [{ ...konto, saldo: {} }] }, { data: [{ ...konto, kontonummer: 123 }] }]) ungueltig(pruefen, fall);
});

test('kontobewegung_seiten_status_und_storno', () => {
  const pruefen = validator('kontobewegung');
  const basis = { id: 'bewegung-001', belegnummer: '000123', belegdatum: '2026-10-01',
    bezeichnung: 'Beiträge', betrag: '125.00', buchungsseite: 'soll', waehrung: 'EUR',
    ausgleichsstatus: 'offen', storniert: false, positionen: [] };
  // Buchungsseite, Betragsvorzeichen und Ausgleichsstatus bleiben unabhängig.
  for (const buchungsseite of ['soll', 'haben']) {
    for (const betrag of ['125.00', '-125.00', '0.00']) {
      for (const ausgleichsstatus of ['offen', 'teilweise_ausgeglichen', 'ausgeglichen', 'statistisch']) {
        gueltig(pruefen, { ...basis, buchungsseite, betrag, ausgleichsstatus, storniert: true });
      }
    }
  }
  gueltig(pruefen, { ...basis, storniert: true, storniert_am: '2026-10-02' });
  gueltig(pruefen, { ...basis, offener_betrag: '0.00', schwebend: true });
  for (const feld of Object.keys(basis)) {
    const fall = { ...basis }; delete fall[feld]; ungueltig(pruefen, fall, feld);
  }
  for (const aenderung of [{ betrag: 125.0 }, { betrag: '-0.00' }, { buchungsseite: 'credit' },
    { waehrung: 'USD' }, { offener_betrag: '-0.01' }, { ausgleichsstatus: 'storniert' },
    { storniert_am: '2026-10-02' }, { belegdatum: '2026-02-30' }, { belegnummer: 123 },
    { faellig_am: null }, { positionen: null }, { schwebend: null },
    { wertstellung_am: '2026-10-01T00:00:00Z' }]) ungueltig(pruefen, { ...basis, ...aenderung });
});

test('kontobewegungsposition_eigene_zeitraeume', () => {
  const pruefen = validator('kontobewegungsposition');
  const basis = { id: 'position-001', betrag: '100.00', buchungsseite: 'soll' };
  gueltig(pruefen, basis);
  // Offene oder unbekannte Grenzen werden nicht zu erfundenen vollen Zeiträumen.
  gueltig(pruefen, { ...basis, bezugszeitraum_von: '2026-10-01' });
  gueltig(pruefen, { ...basis, bezugszeitraum_bis: '2026-10-31' });
  gueltig(pruefen, { ...basis, bezugszeitraum_von: '2026-10-01',
    bezugszeitraum_bis: '2026-10-31', faellig_am: '2026-11-15' });
  for (const feld of Object.keys(basis)) {
    const fall = { ...basis }; delete fall[feld]; ungueltig(pruefen, fall);
  }
  for (const aenderung of [{ betrag: '100,00' }, { bezugszeitraum_von: '2026-02-30' },
    { bezugszeitraum_bis: null }, { buchungsseite: 'unbekannt' }]) ungueltig(pruefen, { ...basis, ...aenderung });
});

test('kontobewegungsliste_zaehlt_bewegungen', () => {
  const pruefen = validator('kontobewegungsliste');
  const bewegung = structuredClone(dokument.paths[
    '/personen/{person_id}/zahlungskonten/{zahlungskonto_id}/kontobewegungen'
  ].get.responses['200'].content['application/json'].examples.beitrag_mit_zwei_positionen.value.data[0]);
  gueltig(pruefen, { data: [] });
  const hundert = Array.from({ length: 100 }, (_, i) => ({ ...bewegung, id: `bewegung-${i.toString().padStart(3, '0')}` }));
  gueltig(pruefen, { data: hundert, naechster_versatz: 100 });
  // Positionszahl ist unabhängig von der Seitengröße der Bewegungen.
  bewegung.betrag = '101.00';
  bewegung.positionen = Array.from({ length: 101 }, (_, i) => ({
    id: `position-${i.toString().padStart(3, '0')}`, betrag: '1.00', buchungsseite: 'soll',
  }));
  gueltig(pruefen, { data: [bewegung] });
  for (const fall of [{}, { data: Array(101).fill(bewegung) }, { data: [], naechster_versatz: 0 }]) ungueltig(pruefen, fall);
});

test('kontobewegungen_abfrageparameter', () => {
  const ressource = dokument.paths['/personen/{person_id}/zahlungskonten/{zahlungskonto_id}/kontobewegungen'];
  assert.deepEqual(new Set(parameter(ressource).map((p) => p.name)), new Set(['person_id', 'zahlungskonto_id']));
  const operation = ressource.get;
  const p = Object.fromEntries(parameter(operation).map((p) => [p.name, p]));
  assert.deepEqual(new Set(Object.keys(p)), new Set(['von', 'bis', 'seitengroesse', 'versatz']));
  for (const name of ['von', 'bis']) {
    assert.equal(p[name].required, true);
    assert.equal(p[name].schema.format, 'date');
  }
  for (const [name, erlaubt, verboten] of [['seitengroesse', [1, 100], [0, 101]], ['versatz', [0, 100], [-1]]]) {
    const pruefen = ajv.compile(p[name].schema);
    for (const wert of erlaubt) gueltig(pruefen, wert);
    for (const wert of verboten) ungueltig(pruefen, wert);
  }
});

test('eigene_bezeichner_in_snake_case', () => {
  const muster = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
  for (const definitionen of Object.values(dokument.components)) {
    for (const name of Object.keys(definitionen)) assert.match(name, muster);
  }
  for (const [pointer, objekt] of objekte) {
    for (const name of Object.keys(objekt.properties ?? {})) assert.match(name, muster, pointer);
    if (objekt.operationId) assert.match(objekt.operationId, muster, pointer);
    if (['path', 'query'].includes(objekt.in)) assert.match(objekt.name, muster, pointer);
    for (const name of Object.keys(objekt)) {
      if (name.startsWith('x-')) assert.match(name.slice(2), muster, pointer);
    }
    if (objekt.examples && !Array.isArray(objekt.examples)) {
      for (const name of Object.keys(objekt.examples)) assert.match(name, muster, pointer);
    }
  }
  for (const pfad of Object.keys(dokument.paths)) {
    for (const segment of pfad.split('/').slice(1)) assert.match(segment.replace(/[{}]/g, ''), muster);
  }
});

test('fachliche_codes_erlauben_nur_snake_case', () => {
  const faelle = [
    ['kontaktkanal', (code) => code],
    ['kontakt', (code) => ({ id: 'kontakt-001', status: code })],
    ['personenrolle', (code) => ({ code })],
    ['fehler', (code) => ({ code, meldung: 'Beispiel' })],
    ['parameter_hinweis', (code) => ({ parameter: 'adresse.land', grund: code })],
  ];
  for (const [name, objekt] of faelle) {
    const pruefen = validator(name);
    for (const code of ['beispiel', 'weiterer_code']) gueltig(pruefen, objekt(code), name);
    for (const code of ['Code', '_code', 'code_', 'code__wert', 'code-wert']) {
      ungueltig(pruefen, objekt(code), name);
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
