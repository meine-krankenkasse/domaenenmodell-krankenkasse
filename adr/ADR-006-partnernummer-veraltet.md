# ADR-006: Partnernummer als veraltete Kennung

Status: Angenommen für diesen Entwurf.

## Kontext

Die partnernummer ist eine fachliche Personenkennung im Datenbestand einer Krankenkasse und dort eindeutig. Sie ist nicht kassenübergreifend eindeutig und stark von heutigen Kernsystemen geprägt. Ein Domänenmodell, das sie außerhalb des Backends als Zugangsschlüssel verwendet, bindet Anwendungen an diese Systeme und erschwert deren Weiterentwicklung oder Austausch. Für die Identifikation einer Person stehen kvnr, rvnr und die Ressourcen-ID person_id zur Verfügung.

Gleichzeitig nutzen bestehende Abläufe mehrerer Krankenkassen die partnernummer. Eine sofortige Entfernung würde diese Lösungen ausschließen. Eine bloße Umbenennung, etwa in eine allgemeine kasseninterne Personenkennung, würde die Systemabhängigkeit nicht beseitigen.

## Entscheidung

Die partnernummer bleibt vorerst Bestandteil des Vertrags, wird aber ausdrücklich als veraltet gekennzeichnet. Sie wird als Personenkennung in den Stammdaten geliefert und ist in der Kennungssuche als gesonderte Angabe neben kvnr und rvnr zulässig. Da ihr Format sich mit dem von kvnr und rvnr überschneiden kann, wird sie nicht aus dem Wert abgeleitet, sondern in einem eigenen Feld übergeben.

Die Kennzeichnung erfolgt mit dem Schlüsselwort deprecated aus JSON Schema an den betroffenen Schemas und Feldern sowie mit einem Hinweis in den Beschreibungen. Wo eine Kennzeichnung technisch nicht möglich ist, etwa für einzelne Werte einer Aufzählung, genügt der Hinweis in der Beschreibung. Die partnernummer wird in keine weiteren Ressourcen, Suchen oder Parameter aufgenommen.

## Konsequenzen

Bestehende Abläufe können die partnernummer weiter nutzen. Neue Anwendungen verwenden kvnr, rvnr oder person_id. Clients müssen damit rechnen, dass die partnernummer in einer späteren Version entfällt. Eine Entfernung erfolgt durch einen neuen ADR, der diesen ersetzt, und ist eine inkompatible Vertragsänderung.

Die Benennung nach ADR-004 bleibt unverändert. Ob hinter der partnernummer ein eigenständiges, systemunabhängiges fachliches Konzept steht, bleibt eine offene Frage.
