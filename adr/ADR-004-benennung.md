# ADR-004: Einheitliche deutsche Benennung mit snake_case

Status: Angenommen für diesen Entwurf; auf ausdrücklichen Wunsch während der Entwurfsarbeit direkt überarbeitet.

## Kontext

Eine einheitliche Schreibweise reduziert Sonderregeln und erleichtert die Verwendung des Vertrags. Die bisherige Unterscheidung zwischen Attributen, Schemas und Operationsnamen bringt für diesen Entwurf keinen erforderlichen Mehrwert.

## Entscheidung

Fachliche Namen und Beschreibungen bleiben deutsch. Alle selbst definierten technischen Bezeichner verwenden snake_case: Attribute, Pfad- und Query-Parameter, Pfadsegmente, Komponenten einschließlich Schemas, operationId-Werte, Tags, Beispielbezeichner und eigene Fehlercodes. Beispiele sind person_id, stammdaten_suchkriterien, personen_suchen und treffermenge_zu_gross. Übliche technische Begriffe wie id und data sind zulässig.

OpenAPI-Erweiterungen behalten das vorgeschriebene Präfix x-; der eigene Namensanteil verwendet snake_case, beispielsweise x-mcp_annotations. Vorgeschriebene Schlüssel von OpenAPI, JSON Schema und MCP sowie HTTP-Header behalten ihre festgelegten Namen, beispielsweise operationId, readOnlyHint und Idempotency-Key. Frei formulierte Titel und Beschreibungen sind keine technischen Bezeichner. Standardisierte Werte wie HTTP-Methoden und Ländercodes werden nicht umbenannt.

## Konsequenzen

Die Umstellung bestehender Bezeichner ist eine inkompatible Vertragsänderung. Referenzen, Beschreibungen, Beispiele, Fehlercodes und Validierungsmuster werden gemeinsam angepasst. Generierter Anwendungscode kann unabhängig davon die Namenskonventionen seiner Zielsprache verwenden; der API-Vertrag behält snake_case.
