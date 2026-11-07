"""Vertragstests für die OpenAPI-Spezifikation und ihre Beispiele."""

import copy
import unittest
from pathlib import Path
from urllib.parse import quote

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate
from referencing import Registry
from referencing.jsonschema import DRAFT202012


class EindeutigeSchluessel(yaml.SafeLoader):
    """PyYAML darf doppelte Schlüssel nicht stillschweigend überschreiben."""

    def construct_mapping(self, node, deep=False):
        self.flatten_mapping(node)
        namen = [self.construct_object(key, deep=deep) for key, _ in node.value]
        if len(namen) != len(set(namen)):
            raise ValueError(f"Doppelte YAML-Schlüssel bei {node.start_mark}")
        return super().construct_mapping(node, deep=deep)


def knoten(wert, pointer=""):
    """Objekte mit ihrem JSON-Pointer liefern; Beispieldaten sind keine Spec-Knoten."""
    if isinstance(wert, dict):
        yield pointer, wert
        for name, kind in wert.items():
            if name not in {"example", "examples"}:
                segment = str(name).replace("~", "~0").replace("/", "~1")
                yield from knoten(kind, f"{pointer}/{segment}")
    elif isinstance(wert, list):
        for index, kind in enumerate(wert):
            yield from knoten(kind, f"{pointer}/{index}")


def beispiele(objekte, resolver):
    """Schema-, Parameter-, Anfrage- und Antwortbeispiele ihrem Schema zuordnen."""
    for pointer, objekt in objekte:
        if isinstance(objekt.get("examples"), list):
            for index, wert in enumerate(objekt["examples"]):
                yield f"{pointer}/examples/{index}", pointer, wert
        if "schema" not in objekt:
            continue
        schema_pointer = f"{pointer}/schema"
        if "example" in objekt:
            yield f"{pointer}/example", schema_pointer, objekt["example"]
        for name, beispiel in objekt.get("examples", {}).items():
            if "$ref" in beispiel:
                referenz = beispiel["$ref"]
                if not referenz.startswith("#/"):
                    raise ValueError(f"Externes Beispiel bei {pointer}: {referenz}")
                beispiel = resolver.lookup(referenz).contents
            if "externalValue" in beispiel:
                raise ValueError(f"Externes Beispiel bei {pointer}: {name}")
            if "value" in beispiel:
                yield f"{pointer}/examples/{name}", schema_pointer, beispiel["value"]


class SpezifikationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        datei = Path(__file__).resolve().parents[1] / "openapi.yaml"
        cls.dokument = yaml.load(
            datei.read_text(encoding="utf-8"), Loader=EindeutigeSchluessel
        )
        cls.uri = datei.as_uri()
        cls.registry = Registry().with_resource(
            cls.uri, DRAFT202012.create_resource(cls.dokument)
        )
        cls.resolver = cls.registry.resolver(cls.uri)
        cls.objekte = list(knoten(cls.dokument))

    def test_openapi_vertrag(self):
        """Standardvalidierung einschließlich Operationsnamen und Pfadparameter."""
        validate(self.dokument)

    def test_referenzen_sind_lokal_und_aufloesbar(self):
        for pointer, objekt in self.objekte:
            if "$ref" in objekt:
                with self.subTest(ort=pointer):
                    referenz = objekt["$ref"]
                    self.assertTrue(referenz.startswith("#/"), referenz)
                    self.resolver.lookup(referenz)

    def test_beispiele_erfuellen_ihre_schemas(self):
        for ort, schema_pointer, wert in beispiele(self.objekte, self.resolver):
            with self.subTest(beispiel=ort):
                validator = Draft202012Validator(
                    {"$ref": self.uri + "#" + quote(schema_pointer, safe="/~")},
                    registry=self.registry,
                    format_checker=FormatChecker(),
                )
                fehler = [error.message for error in validator.iter_errors(wert)]
                self.assertEqual(fehler, [], "\n".join(fehler))

    def schema_validator(self, name):
        return Draft202012Validator(
            {"$ref": self.uri + "#/components/schemas/" + name},
            registry=self.registry,
            format_checker=FormatChecker(),
        )

    def test_kontakt_anlage_grenzen_und_pflichtangaben(self):
        basis = {
            "kontakt_am": "2026-10-20T09:00:00Z",
            "kanal": "chat",
            "status": "erledigt",
            "betreff": "Rückfrage",
            "bemerkung": "Das Anliegen wurde besprochen.",
            "maschinell_erzeugt": True,
            "externe_id": "kundenportal:gespraech-001",
        }
        validator = self.schema_validator("kontakt_anlage")
        validator.validate(basis)
        manuell = {**basis, "maschinell_erzeugt": False}
        del manuell["externe_id"]
        validator.validate(manuell)
        validator.validate({**basis, "externe_id": "a" * 64})
        for status in ["erledigt", "in_bearbeitung", "storniert"]:
            validator.validate({**basis, "status": status})
        validator.validate({**basis, "betreff": "Ä" * 120, "bemerkung": "🙂" * 2400})
        ungueltig = {
            "Betreff zu lang": {**basis, "betreff": "a" * 121},
            "Bemerkung zu lang": {**basis, "bemerkung": "a" * 2401},
            "Leerer Inhalt": {**basis, "bemerkung": "  "},
            "Ungültiger Kanalcode": {**basis, "kanal": "Chat Bot"},
            "Fehlende Zeitzone": {**basis, "kontakt_am": "2026-10-20T09:00:00"},
            "Ungültiges Datum": {**basis, "kontakt_am": "2026-02-30T09:00:00Z"},
            "Nicht vorgesehener Status": {**basis, "status": "erfasst"},
            "Fremde Person im Body": {**basis, "person_id": "andere-person"},
            "Null statt unbekannt": {**basis, "richtung": None},
            "Externe ID zu lang": {**basis, "externe_id": "a" * 65},
            "Externe ID kein Text": {**basis, "externe_id": {"id": "001"}},
            "Leere externe ID": {**basis, "externe_id": ""},
        }
        for name in basis:
            fall = copy.deepcopy(basis)
            del fall[name]
            ungueltig["Fehlendes Pflichtfeld: " + name] = fall
        for name, fall in ungueltig.items():
            with self.subTest(fall=name):
                self.assertFalse(validator.is_valid(fall))

    def test_idempotenzschluessel_format(self):
        validator = self.schema_validator("idempotenzschluessel")
        schluessel = "06a37d58-d26f-4ee6-9b26-41ff8bea57a1"
        validator.validate(schluessel)
        for wert in ["", "beliebig", schluessel.upper(), '"' + schluessel + '"',
                     "06a37d58-d26f-1ee6-9b26-41ff8bea57a1"]:
            with self.subTest(wert=wert):
                self.assertFalse(validator.is_valid(wert))

    def test_kontaktantworten_und_seitengrenze(self):
        validator = self.schema_validator("kontaktliste")
        kontakt = {"id": "kontakt-001", "kontakt_am": "2026-10-20T09:00:00Z"}
        validator.validate({"data": []})
        validator.validate({"data": [kontakt] * 100})
        validator.validate({"data": [{
            **kontakt, "zusaetzliches_feld": "erlaubt",
            "externe_id": "portal:001", "archiviert": True,
        }]})
        self.schema_validator("kontakt").validate({"id": "kontakt-ohne-zeit"})
        for wert in [{}, {"data": [kontakt] * 101}, {"data": [{"kontakt_am": "2026-10-20T09:00:00Z"}]},
                     {"data": [], "naechster_versatz": -1}]:
            with self.subTest(antwort=wert):
                self.assertFalse(validator.is_valid(wert))

    def test_aufgabe_anlage_grenzen(self):
        validator = self.schema_validator("aufgabe_anlage")
        basis = {"aufgabendefinitionsname": "Allgemeine Bearbeitung"}
        validator.validate(basis)
        validator.validate({**basis, "info": "a" * 50, "bemerkung": "a" * 2000,
                            "vorgangsnotiz": "a" * 1200, "wiedervorlagedatum": "2026-11-10"})
        for fall in [{}, {**basis, "info": "a" * 51},
                     {**basis, "bemerkung": "a" * 2001},
                     {**basis, "vorgangsnotiz": "a" * 1201},
                     {**basis, "aufgabendefinitionsname": "a" * 121},
                     {**basis, "wiedervorlagedatum": "2026-02-30"},
                     {**basis, "wiedervorlagedatum": "2026-11-10T09:00:00Z"},
                     {**basis, "person_id": "andere-person"},
                     {**basis, "status": "erledigt"},
                     {**basis, "bearbeiter_id": "anderer-bearbeiter"}]:
            with self.subTest(anfrage=fall):
                self.assertFalse(validator.is_valid(fall))

    def test_aufgabenliste_ist_personenweit(self):
        validator = self.schema_validator("aufgabenliste")
        basis = {"data": []}
        validator.validate(basis)
        validator.validate({"data": [
            {"id": "aufgabe-001", "bearbeiter_id": "mitarbeiter-001"},
            {"id": "aufgabe-002", "bearbeiter_id": "mitarbeiter-002"},
            {"id": "aufgabe-003"},
        ]})
        operation = self.dokument["paths"]["/personen/{person_id}/aufgaben"]["get"]
        self.assertNotIn("bearbeiter_id", [p["name"] for p in operation["parameters"]])
        validator.validate({**basis, "data": [{"id": "aufgabe-001"}] * 100})
        for feld in basis:
            fall = {k: v for k, v in basis.items() if k != feld}
            self.assertFalse(validator.is_valid(fall))
        for fall in [{**basis, "data": [{"id": "aufgabe-001"}] * 101},
                     {**basis, "naechster_versatz": 0}]:
            self.assertFalse(validator.is_valid(fall))

    def test_personenangaben_unbekannt_und_leer(self):
        person = self.schema_validator("person")
        person.validate({"id": "person-001"})
        person.validate({"id": "person-001", "betreuungshinweise": []})
        self.assertFalse(person.is_valid({"id": "person-001", "betreuungshinweise": True}))
        self.assertFalse(person.is_valid({"id": "person-001", "betreuungshinweise": [ {} ]}))
        adresse = self.schema_validator("adresse")
        adresse.validate({"id": "adresse-001", "art": "zustelladresse", "postfach": "123"})
        self.assertFalse(adresse.is_valid({"id": "adresse-001", "art": "ferienadresse"}))
        self.schema_validator("kontaktdatum").validate(
            {"id": "kontaktdatum-001", "art": "mobil", "wert": "+49 170 0000000"})

    def test_schreiboperation_hat_idempotenzparameter(self):
        for pfad in ["/personen/{person_id}/kontakte", "/personen/{person_id}/aufgaben"]:
            with self.subTest(pfad=pfad):
                operation = self.dokument["paths"][pfad]["post"]
                parameter = next(p for p in operation["parameters"] if p["name"] == "Idempotency-Key")
                self.assertEqual(parameter["in"], "header")
                self.assertTrue(parameter["required"])
                self.assertFalse(operation["x-mcp_annotations"]["readOnlyHint"])
                self.assertTrue(operation["x-mcp_annotations"]["idempotentHint"])

    def test_kontosaldo_betraege_und_pflichtangaben(self):
        validator = self.schema_validator("kontosaldo")
        basis = {"betrag": "0.00", "waehrung": "EUR", "stichtag": "2026-11-07"}
        for betrag in ["0.00", "0.01", "-0.01", "125.50", "-125.50", "9999999999999.99"]:
            validator.validate({**basis, "betrag": betrag})
        for betrag in [0, 125.50, None, "-0.00", "+1.00", "01.00", "1", "1.0",
                       "1.001", "1,00", "1e2", " 1.00", "1.00\n"]:
            with self.subTest(betrag=betrag):
                self.assertFalse(validator.is_valid({**basis, "betrag": betrag}))
        for feld in basis:
            self.assertFalse(validator.is_valid({k: v for k, v in basis.items() if k != feld}))
        for fall in [{**basis, "waehrung": "USD"}, {**basis, "stichtag": "2026-02-30"},
                     {**basis, "stichtag": "2026-11-07T09:00:00Z"}]:
            self.assertFalse(validator.is_valid(fall))

    def test_zahlungskonten_fehlender_saldo_ist_keine_null(self):
        validator = self.schema_validator("zahlungskontenliste")
        konto = {"id": "konto-001", "kontonummer": "000123", "saldo": {
            "betrag": "0.00", "waehrung": "EUR", "stichtag": "2026-11-07"}}
        validator.validate({"data": []})
        validator.validate({"data": [konto, {**konto, "id": "konto-002",
                                             "kontonummer": "000124"}]})
        validator.validate({"data": [{**konto, "zusaetzliches_feld": "erlaubt"}]})
        for feld in konto:
            fall = {k: v for k, v in konto.items() if k != feld}
            self.assertFalse(validator.is_valid({"data": [fall]}))
        for fall in [{}, {"data": None}, {"data": [{**konto, "saldo": None}]},
                     {"data": [{**konto, "saldo": {}}]},
                     {"data": [{**konto, "kontonummer": 123}]}]:
            self.assertFalse(validator.is_valid(fall))

    def test_kontobewegung_seiten_status_und_storno(self):
        validator = self.schema_validator("kontobewegung")
        basis = {"id": "bewegung-001", "belegnummer": "000123", "belegdatum": "2026-10-01",
                 "bezeichnung": "Beiträge", "betrag": "125.00", "buchungsseite": "soll",
                 "waehrung": "EUR", "ausgleichsstatus": "offen", "storniert": False,
                 "positionen": []}
        # Buchungsseite, Betragsvorzeichen und Ausgleichsstatus bleiben unabhängig.
        for seite in ["soll", "haben"]:
            for betrag in ["125.00", "-125.00", "0.00"]:
                for status in ["offen", "teilweise_ausgeglichen", "ausgeglichen", "statistisch"]:
                    validator.validate({**basis, "buchungsseite": seite, "betrag": betrag,
                                        "ausgleichsstatus": status, "storniert": True})
        validator.validate({**basis, "storniert": True, "storniert_am": "2026-10-02"})
        validator.validate({**basis, "offener_betrag": "0.00", "schwebend": True})
        for feld in basis:
            fall = {k: v for k, v in basis.items() if k != feld}
            self.assertFalse(validator.is_valid(fall), feld)
        for aenderung in [{"betrag": 125.0}, {"betrag": "-0.00"}, {"buchungsseite": "credit"},
                          {"waehrung": "USD"}, {"offener_betrag": "-0.01"},
                          {"ausgleichsstatus": "storniert"}, {"storniert_am": "2026-10-02"},
                          {"belegdatum": "2026-02-30"}, {"belegnummer": 123},
                          {"faellig_am": None}, {"positionen": None}, {"schwebend": None},
                          {"wertstellung_am": "2026-10-01T00:00:00Z"}]:
            with self.subTest(aenderung=aenderung):
                self.assertFalse(validator.is_valid({**basis, **aenderung}))

    def test_kontobewegungsposition_eigene_zeitraeume(self):
        validator = self.schema_validator("kontobewegungsposition")
        basis = {"id": "position-001", "betrag": "100.00", "buchungsseite": "soll"}
        validator.validate(basis)
        # Offene oder unbekannte Grenzen sind keine erfundenen vollen Zeiträume.
        validator.validate({**basis, "bezugszeitraum_von": "2026-10-01"})
        validator.validate({**basis, "bezugszeitraum_bis": "2026-10-31"})
        validator.validate({**basis, "bezugszeitraum_von": "2026-10-01",
                            "bezugszeitraum_bis": "2026-10-31", "faellig_am": "2026-11-15"})
        for feld in basis:
            self.assertFalse(validator.is_valid({k: v for k, v in basis.items() if k != feld}))
        for aenderung in [{"betrag": "100,00"}, {"bezugszeitraum_von": "2026-02-30"},
                          {"bezugszeitraum_bis": None}, {"buchungsseite": "unbekannt"}]:
            self.assertFalse(validator.is_valid({**basis, **aenderung}))

    def test_kontobewegungsliste_zaehlt_bewegungen(self):
        validator = self.schema_validator("kontobewegungsliste")
        bewegung = copy.deepcopy(self.dokument["paths"][
            "/personen/{person_id}/zahlungskonten/{zahlungskonto_id}/kontobewegungen"][
                "get"]["responses"]["200"]["content"]["application/json"][
                    "examples"]["beitrag_mit_zwei_positionen"]["value"]["data"][0])
        validator.validate({"data": []})
        hundert = [{**bewegung, "id": f"bewegung-{i:03d}"} for i in range(100)]
        validator.validate({"data": hundert, "naechster_versatz": 100})
        # Positionszahl ist unabhängig von der Seitengröße der Bewegungen.
        bewegung["betrag"] = "101.00"
        bewegung["positionen"] = [{"id": f"position-{i:03d}", "betrag": "1.00",
                                   "buchungsseite": "soll"} for i in range(101)]
        validator.validate({"data": [bewegung]})
        for fall in [{}, {"data": [bewegung] * 101}, {"data": [], "naechster_versatz": 0}]:
            self.assertFalse(validator.is_valid(fall))

    def test_kontobewegungen_abfrageparameter(self):
        pfad = "/personen/{person_id}/zahlungskonten/{zahlungskonto_id}/kontobewegungen"
        ressource = self.dokument["paths"][pfad]
        self.assertEqual({p["name"] for p in ressource["parameters"]},
                         {"person_id", "zahlungskonto_id"})
        operation = ressource["get"]
        parameter = {p["name"]: p for p in operation["parameters"]}
        self.assertEqual(set(parameter), {"von", "bis", "seitengroesse", "versatz"})
        for name in ["von", "bis"]:
            self.assertTrue(parameter[name]["required"])
            self.assertEqual(parameter[name]["schema"]["format"], "date")
        self.assertTrue(operation["x-mcp_annotations"]["readOnlyHint"])
        for name, gueltig, ungueltig in [("seitengroesse", [1, 100], [0, 101]),
                                         ("versatz", [0, 100], [-1])]:
            validator = Draft202012Validator(parameter[name]["schema"])
            for wert in gueltig:
                validator.validate(wert)
            for wert in ungueltig:
                self.assertFalse(validator.is_valid(wert))

    def test_eigene_bezeichner_in_snake_case(self):
        muster = r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$"
        for definitionen in self.dokument["components"].values():
            for name in definitionen:
                self.assertRegex(name, muster)
        for pointer, objekt in self.objekte:
            with self.subTest(ort=pointer):
                for name in objekt.get("properties", {}):
                    self.assertRegex(name, muster)
                if "operationId" in objekt:
                    self.assertRegex(objekt["operationId"], muster)
                if objekt.get("in") in {"path", "query"}:
                    self.assertRegex(objekt["name"], muster)
                for name in objekt:
                    if name.startswith("x-"):
                        self.assertRegex(name[2:], muster)
                if isinstance(objekt.get("examples"), dict):
                    for name in objekt["examples"]:
                        self.assertRegex(name, muster)
        for pfad in self.dokument["paths"]:
            for segment in pfad.split("/")[1:]:
                self.assertRegex(segment.strip("{}"), muster)


class YamlLoaderTests(unittest.TestCase):
    def test_doppelte_schluessel_werden_abgewiesen(self):
        with self.assertRaisesRegex(ValueError, "Doppelte YAML-Schlüssel"):
            yaml.load("name: eins\nname: zwei\n", Loader=EindeutigeSchluessel)


if __name__ == "__main__":
    unittest.main()
