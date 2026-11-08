# ADR-004: Deutsche Begriffe und einheitliche Benennung mit snake_case

Status: Angenommen für diesen Entwurf; auf ausdrücklichen Wunsch während der Entwurfsarbeit direkt überarbeitet.

## Kontext

Eine einheitliche Schreibweise reduziert Sonderregeln und erleichtert die Verwendung des Vertrags. Die bisherige Unterscheidung zwischen Attributen, Schemas und Operationsnamen bringt für diesen Entwurf keinen erforderlichen Mehrwert.

## Entscheidung

Fachliche Namen und Beschreibungen bleiben deutsch. Alle selbst definierten technischen Bezeichner verwenden snake_case: Attribute, Pfad- und Query-Parameter, Pfadsegmente, Komponenten einschließlich Schemas, operationId-Werte, Tags, Beispielbezeichner und eigene Fehlercodes. Beispiele sind person_id, stammdaten_suchkriterien, personen_suchen und treffermenge_zu_gross. Übliche technische Begriffe wie id und data sind zulässig.

Fachliche Begriffe werden möglichst ausgeschrieben. Insbesondere heißen die Nummernarten krankenversicherungsnummer, rentenversicherungsnummer und partnernummer. Fachliche Abkürzungen werden in selbst definierten Bezeichnern und Beschreibungen vermieden; auch Postleitzahl wird ausgeschrieben. Allgemein etablierte technische Begriffe wie API, HTTP, REST, JSON und id sowie standardisierte Codes und Header bleiben zulässig.

Begriffe werden am zugehörigen Schema kurz definiert. Die Einleitung bietet einen Überblick und wiederholt weder die Begriffsdefinitionen noch die Feldregeln. Gleiche fachliche Begriffe haben im gesamten Vertrag dieselbe Bedeutung; unterschiedliche Begriffe werden nicht allein wegen gleicher Datenform zusammengelegt.

OpenAPI-Erweiterungen behalten das vorgeschriebene Präfix x-; der eigene Namensanteil verwendet snake_case. Vorgeschriebene Schlüssel von OpenAPI und JSON Schema sowie HTTP-Header behalten ihre festgelegten Namen, beispielsweise operationId und Idempotency-Key. Frei formulierte Titel und Beschreibungen sind keine technischen Bezeichner. Standardisierte Werte wie HTTP-Methoden und Ländercodes werden nicht umbenannt.

## Konsequenzen

Die Umstellung bestehender Bezeichner ist eine inkompatible Vertragsänderung. Referenzen, Beschreibungen, Beispiele, Fehlercodes und Validierungsmuster werden gemeinsam angepasst. Generierter Anwendungscode kann unabhängig davon die Namenskonventionen seiner Zielsprache verwenden; der API-Vertrag behält snake_case.
