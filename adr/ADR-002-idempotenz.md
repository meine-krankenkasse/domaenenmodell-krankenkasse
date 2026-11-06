# ADR-002: Wiederholbare Schreiboperationen

Status: Angenommen für diesen Entwurf.

## Kontext

Verbindungsabbrüche und Wiederholungen durch Anwendungen oder Agenten dürfen keine doppelten Daten oder sonstigen fachlichen Wirkungen erzeugen. Die natürliche Idempotenz bestimmter HTTP-Methoden allein deckt nicht alle Abläufe ab.

## Entscheidung

Jede fachlich schreibende Operation verlangt Idempotency-Key als HTTP-Header, einschließlich PUT, PATCH und DELETE. Dies ist eine zusätzliche Vertragsregel von Domänenmodell Krankenkasse. Fachlich lesende Operationen benötigen keinen Schlüssel, auch die POST-Stammdatensuche nicht.

Der Client verwendet denselben Schlüssel für Wiederholungen desselben Auftrags und einen neuen für einen neuen Auftrag. Die serverseitige Implementierung bindet den Schlüssel an einen definierten Geltungsbereich und die relevanten Eingaben. Abweichende Aufträge unter demselben Schlüssel werden abgelehnt.

Das Backend muss Wiederholungen einschließlich konkurrierender Anfragen zuverlässig deduplizieren. Die Absicherung umfasst nachgelagerte fachliche Wirkungen; ein vorgeschalteter Ergebniscache allein reicht bei einem unklaren Backend-Ergebnis nicht. Ein solcher Zustand muss aufgeklärt werden, bevor eine erneute Schreibwirkung zugelassen wird. Erneute Anfragen werden weiterhin authentisiert und autorisiert.

Aufbewahrungsdauer, Verhalten nach Ablauf, genauer Geltungsbereich und Ergebniswiedergabe werden bei der Umsetzung festgelegt. Der fachliche Entwurf legt dafür noch keine Speicherfristen oder dauerhaften Schlüsselsperren fest. Für Clients relevante Zusagen werden vor produktiver Nutzung im API-Vertrag ergänzt; die konkrete Speichertechnik bleibt Implementierungsdetail.

Eine fachliche Ereignisreferenz kann zusätzlich Dubletten bei unterschiedlichen technischen Aufträgen verhindern. Sie ersetzt den Idempotency-Key nicht; ihre Eindeutigkeitsregeln gehören in den jeweiligen Ressourcenvertrag.

## Konsequenzen

Idempotenz ist eine implementierungspflichtige fachliche Garantie, keine reine Dokumentationskonvention. Bei verteilten Wirkungen muss die Implementierung eine passende Absicherung nachweisen. Der Schlüssel ersetzt weder Autorisierung noch fachliche Eindeutigkeitsregeln oder Schutz vor konkurrierenden unterschiedlichen Änderungen.

Fachlich lesende Operationen erhalten keinen ungenutzten Header-Parameter. Wiederholbare Leseoperationen können wegen zwischenzeitlicher Änderungen unterschiedliche Ergebnisse liefern.
