# ADR-005: Modulare Spezifikation mit eigenständiger Gesamtdatei

Status: Angenommen für diesen Entwurf; auf ausdrücklichen Wunsch wird die Gesamtdatei ausschließlich als Build-Ausgabe erzeugt. Keine organisationsübergreifende Freigabe.

## Kontext

Eine wachsende OpenAPI-Datei erschwert die manuelle Bearbeitung, fachliche Reviews und die Wiederverwendung gemeinsamer Definitionen. Gleichzeitig muss der vollständige Vertrag als einzelne Datei ohne begleitende Dateien nutzbar bleiben.

## Entscheidung

Die gepflegten Quellen liegen unter `spezifikation/` und sind die einzige maßgebliche Vertragsgrundlage. Redocly CLI erzeugt daraus die eigenständig nutzbare Gesamtdatei. Sie wird nicht eingecheckt und liegt nicht im Repository-Wurzelverzeichnis. `npm run bundle` schreibt eine lokale Austauschdatei nach `build/openapi.yaml`. Die Werkzeugversion ist in `package.json` festgelegt und über `package-lock.json` reproduzierbar installierbar.

Die Quellen folgen dieser Struktur:

- `openapi.yaml`: Einstieg mit Metadaten, Einleitung, Tags sowie dem Verzeichnis der Pfade und benannten Komponenten. Die aktuelle API-Version wird nur hier gepflegt und in die Gesamtdatei übernommen.
- `pfade/`: Eine Datei je Ressourcenpfad, nach Ressourcenhierarchie gegliedert. Alle HTTP-Methoden desselben Pfads und gemeinsame Pfadparameter stehen zusammen. `sammlung.yaml`, `einzelperson.yaml` und `suche.yaml` unterscheiden die entsprechenden Personenpfade; Unterressourcen erhalten sprechende Namen.
- `schemas/`: Ein benanntes Schema je Datei, fachlich untergliedert in `personen/`, `kontakte/`, `aufgaben/` und `zahlungskonten/`. Bereichsübergreifende Bausteine stehen unter `gemeinsam/`. Weitere Bereiche entstehen bei konkretem Bedarf.
- `parameter/`: Mehrfach verwendete Parameter mit übereinstimmender Bedeutung und vollständiger Definition.
- `antworten/`: Wiederverwendbare Antworten. Die kleine Gruppe gemeinsamer Fehlerantworten steht zunächst als benannte Einträge in `fehlerantworten.yaml`.
- Weitere Verzeichnisse, etwa für Header oder Sicherheitsdefinitionen, entstehen erst bei konkretem Bedarf. Der aktuelle fachliche Entwurf enthält sie nicht.

Datei- und Verzeichnisnamen sind deutsch und verwenden snake_case. Die von OpenAPI vorgeschriebenen Schlüssel bleiben unverändert. Beispiele stehen zunächst bei ihrem Schema oder Endpunkt; zusätzliche Beispielverzeichnisse entstehen erst bei Bedarf.

Referenzen verwenden relative Dateipfade und gegebenenfalls JSON-Pointer. Sie bleiben innerhalb von `spezifikation/`. Endpunkte verweisen direkt auf benötigte Definitionen; Definitionen verweisen direkt auf ihre Abhängigkeiten. Bausteine verweisen nicht auf den Einstieg oder die erzeugte Gesamtdatei zurück. Die Registrierung benannter Komponenten im Einstieg erhält deren stabile Namen im Gesamtvertrag.

Wiederverwendung folgt fachlicher Bedeutung, nicht nur gleicher Form. Fachliche Grundbegriffe bleiben ihrem Bereich zugeordnet. Anfragen und Antworten bleiben getrennt, wenn Pflichtfelder, Wertebereiche oder Vollständigkeitsregeln abweichen. Zeitfilter mit unterschiedlichem Bezug sowie Parameter mit unterschiedlichen Beschreibungen bleiben beim jeweiligen Endpunkt. Aktuell wird der identische Idempotenzparameter gemeinsam definiert. Die Aufteilung begründet keine generischen Listen-, Objekt- oder Vererbungsmodelle.

Die veröffentlichte Gesamtdatei enthält ausschließlich dokumentinterne Referenzen. Sie bleibt mit Beschreibungen, Schemas und Beispielen eigenständig nutzbar. Interne Grundlagen bleiben außerhalb des öffentlichen Repositorys.

## Konsequenzen

Die Bearbeitung wird auf kleinere fachlich zugeordnete Dateien verteilt. Für das Bündeln werden zusätzlich Node.js und npm benötigt. README und Paketkonfiguration beschreiben den lokalen Ablauf; ein eigener Bundler oder ein separates Prüfskript wird nicht eingeführt.

Die Vertragstests erzeugen bei jedem Aufruf ein frisches temporäres Bündel aus den Quellen und prüfen die Quellspezifikation und diesen Gesamtvertrag mit etablierten Bibliotheken. Ein vorheriger manueller Build ist nicht erforderlich. Lokale Ausgabedateien haben keinen Einfluss auf die Tests. Alle YAML-Quellen werden auf doppelte Schlüssel geprüft. Referenzen müssen innerhalb des Quellverzeichnisses auflösbar sein. Die bisherigen Prüfungen der Beispiele und fachlichen Vertragsgrenzen bleiben bestehen.

Der Workflow erzeugt die Gesamtdatei automatisch und führt die Vertragstests vor einer Veröffentlichung aus. Pull Requests werden ebenfalls geprüft. GitHub Pages veröffentlicht die Gesamtdatei zusammen mit Swagger UI; sie ist dort darstellbar und direkt herunterladbar. Ein Abgleich mit einer eingecheckten Gesamtdatei entfällt. Die rein strukturelle Umstellung verändert keine fachlichen Vertragsregeln.
