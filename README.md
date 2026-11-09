# Domänenmodell Krankenkasse

Ein gemeinsames fachliches Modell mit REST-API-Vertrag für Krankenkassen.

Dieses Repository dient als Grundlage für die Abstimmung zwischen Krankenkassen und Partnern, um ein gemeinsames, kassenübergreifend nutzbares Domänenmodell zu entwickeln.

Das offene, erweiterbare Modell bietet Anwendungen und KI-Agenten einen gemeinsamen fachlichen Zugang über Systemgrenzen hinweg. Der erste Entwurf umfasst Personensuche, Stammdaten, Anschriften, Kommunikationsverbindungen und Zahlungskonten mit Salden und Kontobewegungen, das Laden archivierter Dokumente sowie das Lesen und Anlegen von Kontakten und Aufgaben.

Der vollständige Vertrag mit fachlichen Regeln, Schemas, Beispielen und offenen Entscheidungen wird in den modularen Quellen unter [spezifikation/](spezifikation/openapi.yaml) gepflegt. Daraus entsteht automatisch eine eigenständig nutzbare Gesamtdatei; erzeugte Dateien werden nicht eingecheckt.

Entwurfsregeln und Begründungen stehen in den ADRs: [Verfahren](adr/ADR-000-entscheidungen-dokumentieren.md), [REST und HTTP](adr/ADR-001-rest-und-http.md), [Idempotenz](adr/ADR-002-idempotenz.md), [YAGNI](adr/ADR-003-yagni.md), [Benennung](adr/ADR-004-benennung.md) und [Dateistruktur](adr/ADR-005-modulare-spezifikation.md).

## API-Dokumentation im Browser

Die [API-Dokumentation](https://meine-krankenkasse.github.io/domaenenmodell-krankenkasse/) stellt die Spezifikation mit Swagger UI dar. Die [vollständige OpenAPI-Datei](https://meine-krankenkasse.github.io/domaenenmodell-krankenkasse/openapi.yaml) steht dort auch zum Herunterladen bereit. Die Dokumentation bietet keine ausführbaren API-Aufrufe.

## Spezifikation bearbeiten und prüfen

Die Quellen gliedern sich in `pfade/`, fachlich gruppierte Schema-Dateien unter `schemas/`, `parameter/` und `antworten/`. Der Einstieg ist `spezifikation/openapi.yaml`; fachliche Regeln und Beispiele stehen bei den jeweiligen Definitionen. Zusammengehörige Schemas, etwa für Anschriften oder Aufgaben, stehen jeweils in einer gemeinsamen Datei. Die verbindlichen Strukturvorgaben beschreibt ADR-005.

Mit Node.js (ab 22.12) und npm (ab 10) im Verzeichnis dieser README ausführen:

```sh
npm ci
npm test
```

`npm test` erzeugt selbst ein frisches temporäres Bündel und prüft Quellen und Gesamtvertrag mit Redocly CLI sowie Schema-Kompilierbarkeit, Beispiele gegen ihre jeweils deklarierten Schemas und Referenzen. Dafür werden der eingebaute Node.js-Test-Runner, Ajv mit JSON Schema 2020-12 und `ajv-formats` sowie `yaml` verwendet. Doppelte YAML-Schlüssel werden abgewiesen. Fachliche Regeln, konkrete Felder, Wertebereiche und Endpunktumfänge werden derzeit nicht durch zusätzliche inhaltliche Tests festgeschrieben. `npm run lint` führt die OpenAPI-Prüfung der Quellen auch einzeln aus.

Für eine lokale Austauschdatei bei Bedarf `npm run bundle` ausführen. Die Ausgabe liegt unter `build/openapi.yaml`; für die Tests ist dieser Schritt nicht erforderlich. Eingecheckt werden ausschließlich die gepflegten Quellen und Projektdateien.

Der Workflow führt Bündelung und Prüfungen auch für Pull Requests aus. Veröffentlicht wird die geprüfte Gesamtdatei vom Hauptbranch.

## Lizenz

Die Inhalte dieses Repositorys einschließlich Spezifikation, Dokumentation und Tests stehen unter der [Zero-Clause BSD-Lizenz (0BSD)](LICENSE).
