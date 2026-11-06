# ADR-000: Entscheidungen mit ADRs dokumentieren

Status: Angenommen für diesen Entwurf; keine organisationsübergreifende Freigabe.

## Kontext

Das Projekt entwickelt ein gemeinsames fachliches Modell mit API-Vertrag. Grundlegende Entscheidungen brauchen eine nachvollziehbare Begründung und einen erkennbaren Geltungsbereich.

## Entscheidung

Entscheidungen mit dauerhafter Wirkung auf Domänenmodell, API-Vertrag oder Projektarbeit werden als Architecture Decision Records (ADRs) in diesem Verzeichnis dokumentiert. Ein ADR enthält Nummer, Titel, Status, Kontext, Entscheidung und Konsequenzen. Neue Entscheidungen erhalten die nächste freie Nummer.

Statuswerte sind Vorgeschlagen, Angenommen, Abgelehnt und Ersetzt. „Angenommen“ bezeichnet eine Entscheidung für diesen Entwurf und behauptet keine Zustimmung externer Organisationen. Wesentliche Änderungen an angenommenen Entscheidungen erfolgen durch einen neuen ADR, der den bisherigen ausdrücklich ersetzt; der bisherige bleibt erhalten und verweist auf den Nachfolger. Redaktionelle Korrekturen sind direkt möglich.

Nicht jede Feldbeschreibung oder kleine Korrektur braucht einen ADR. Entscheidungsbedarf besteht insbesondere bei übergreifenden Regeln, Alternativen mit relevanten Konsequenzen und inkompatiblen Vertragsänderungen. Offene Fragen bleiben als solche erkennbar.

## Konsequenzen

ADRs dokumentieren übergreifende Entwurfsregeln, Begründungen und die Entwicklung einer Entscheidung. Diese Erläuterungen werden nicht zusätzlich in die Spec kopiert. Die Spec beschreibt den konkreten API-Vertrag einschließlich der zum Aufruf nötigen Regeln und bleibt ohne ADR-Dateien nutzbar. Entscheidungen werden dort durch die konkrete Vertragsgestaltung umgesetzt. Bei Änderungen werden Spec und betroffene ADRs konsistent gehalten. Die README verlinkt die ADRs; die Spec enthält keine Verweise auf begleitende Dateien. ADRs und README enthalten keine konkreten API-Versionsnummern; die aktuelle API-Version steht ausschließlich in der Spec.

Alle ADRs sind öffentlich. Interne Unterlagen, konkrete nicht öffentliche Vorhaben und Systemzuordnungen gehören nicht hinein. Bestehende Entscheidungen werden bei relevanter Weiterentwicklung nachgetragen, ohne sie pauschal als extern abgestimmt darzustellen.
