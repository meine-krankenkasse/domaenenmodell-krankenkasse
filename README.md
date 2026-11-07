# Domänenmodell Krankenkasse

Ein gemeinsames fachliches Modell mit REST-API-Vertrag für Krankenkassen.

Dieses Repository dient als Grundlage für die Abstimmung zwischen Krankenkassen und Partnern, um ein gemeinsames, kassenübergreifend nutzbares Domänenmodell zu entwickeln.

Das offene, erweiterbare Modell bietet Anwendungen und KI-Agenten einen gemeinsamen fachlichen Zugang über Systemgrenzen hinweg. Der erste Entwurf umfasst Personensuche, Stammdaten, Adressen, Kontaktdaten und Zahlungskonten mit Salden und Kontobewegungen sowie das Lesen und Anlegen von Kontakten und Aufgaben.

Der vollständige Vertrag mit fachlichen Regeln, Schemas, Beispielen und offenen Entscheidungen steht in [openapi.yaml](openapi.yaml). Die Spezifikation ist eigenständig nutzbar und die maßgebliche Grundlage für Beiträge und Diskussionen.

Entwurfsregeln und Begründungen stehen in den ADRs: [Verfahren](adr/ADR-000-entscheidungen-dokumentieren.md), [REST und HTTP](adr/ADR-001-rest-und-http.md), [Idempotenz](adr/ADR-002-idempotenz.md), [YAGNI](adr/ADR-003-yagni.md) und [Benennung](adr/ADR-004-benennung.md).

## API-Dokumentation im Browser

Die [API-Dokumentation](https://meine-krankenkasse.github.io/domaenenmodell-krankenkasse/) stellt die Spezifikation mit Swagger UI dar. Sie bietet keine ausführbaren API-Aufrufe.

## Spezifikation prüfen

Mit Python und `uv` im Verzeichnis dieser README ausführen:

```sh
uv run --with-requirements requirements-pruefung.txt python -m unittest discover -s tests -v
```

Die Vertragstests nutzen Pythons `unittest` als Test-Runner, `openapi-spec-validator` für den Vertrag sowie `jsonschema` und `referencing` für die enthaltenen Beispiele und lokalen Referenzen. Doppelte YAML-Schlüssel werden abgewiesen.

## Lizenz

Die Inhalte dieses Repositorys einschließlich Spezifikation, Dokumentation und Tests stehen unter der [Zero-Clause BSD-Lizenz (0BSD)](LICENSE).
