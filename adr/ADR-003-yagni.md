# ADR-003: Nur konkret benötigte Fähigkeiten aufnehmen

Status: Angenommen für diesen Entwurf.

## Kontext

Die Vision eines erweiterbaren Domänenmodells kann zu vorsorglich entworfenen Ressourcen und Mechanismen führen, deren Nutzen noch nicht belegt ist.

## Entscheidung

Es gilt YAGNI: „You Aren't Gonna Need It“. Was für keinen konkret benennbaren Bedarf benötigt wird, wird nicht vorsorglich aufgenommen. Dies gilt für Endpunkte, Felder, Abstraktionen, Erweiterungsmechanismen und Infrastrukturvorgaben.

Für eine Ergänzung werden Bedarf und erwartetes Verhalten beschrieben. Gewählt wird die kleinste fachlich tragfähige Lösung. Vermutete spätere Bedürfnisse bleiben bei Bedarf offene Fragen, statt bereits verpflichtende Vertragsbestandteile zu werden. Ungenutzte Elemente werden bei Überarbeitungen auf ihre Entfernung geprüft.

Der aktuelle Schwerpunkt ist die fachliche Abstimmung. Konkrete Authentisierungsverfahren, Sicherheitsheader und plattformspezifische Zusatzinformationen werden erst bei entsprechendem Umsetzungsbedarf festgelegt. Die fachlichen Auftraggeberkontexte bleiben beschreibbar, ohne bereits ein technisches Sicherheitsverfahren vorzuschreiben. Definitionen stehen beim jeweiligen Begriff; Wiederholungen und vorsorgliche Erweiterungsfelder entfallen.

## Konsequenzen

Das Modell wächst schrittweise. Schreibende Fähigkeiten sind bei Bedarf zulässig, werden aber nicht allein aus der erweiterten Vision heraus erfunden. Sicherheitsanforderungen, Korrektheit und vereinbarte Vertragsgarantien sind notwendige Anforderungen und werden durch YAGNI nicht aufgehoben.
