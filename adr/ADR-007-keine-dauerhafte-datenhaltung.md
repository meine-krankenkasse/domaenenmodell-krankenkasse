# ADR-007: Keine dauerhafte Datenhaltung in der Fassade

Status: Angenommen für diesen Entwurf.

## Kontext

Der Vertrag wird typischerweise als Fassade vor dem Kernsystem und den Archiven einer Krankenkasse umgesetzt. Eine solche Fassade könnte eigene Daten dauerhaft speichern, etwa Kopien von Stammdaten, eigene Kennungen mit Zuordnungstabellen zu Schlüsseln des Kernsystems oder Verweise auf Dokumente. Jeder solche Bestand muss mit dem Kernsystem abgeglichen, datenschutzrechtlich bewertet, gegen unbefugten Zugriff geschützt und bei Änderungen nachgezogen werden, etwa wenn Daten eines Interessenten gelöscht oder zwei Personendatensätze zusammengeführt werden. Das erschwert Produktivsetzung und Betrieb und verdoppelt die Verantwortung für Daten, die bereits im Kernsystem gepflegt werden.

Die Frage stellt sich besonders bei Kennungen. Für Dokumente lag eine einzige undurchsichtige Dokument-ID nahe, über die die Implementierung das zuständige Archiv auflöst. Da eine Krankenkasse mehrere Archive haben kann, setzt das ohne entsprechende Angabe im Kernsystem eine dauerhafte Zuordnung in der Fassade voraus. Für Personen ist offen, wie beständig ihre id ist, insbesondere beim Zusammenführen von Datensätzen. Eine dauerhaft stabile, von der Fassade vergebene id erfordert ebenfalls eine dauerhafte Zuordnungstabelle.

## Entscheidung

Die Fassade speichert keine Daten dauerhaft. Maßgeblich ist ausschließlich das Kernsystem einschließlich seiner Archive. Insbesondere entstehen in der Fassade weder dauerhafte Kopien von Personen-, Konto-, Kontakt-, Aufgaben- oder Dokumentdaten noch dauerhafte Zuordnungen zwischen eigenen Kennungen und Schlüsseln des Kernsystems.

Zulässig sind:

- **Caches:** zeitlich begrenzte Zwischenspeicher, etwa zur Entlastung des Kernsystems oder zur Auflösung befristet gültiger Kennungen. Ein Cache ist nie die einzige Quelle eines Werts; sein Verlust führt höchstens zu erneuten Abfragen oder abgelaufenen Kennungen, nicht zu Datenverlust. Zwischengespeicherte Inhalte werden nur im Rahmen der Berechtigung des jeweiligen Aufrufers ausgeliefert und schwächen keine Zusage des Vertrags ab, etwa zum Abrufdatum eines Saldos oder zur Vollständigkeit einer Liste.
- **Kurzlebige technische Betriebszustände** ohne fachliche Inhalte, soweit der Vertrag sie erfordert. Dazu gehören die für Idempotency-Key nach ADR-002 benötigten Angaben, möglichst als Schlüssel mit Prüfwert der Eingaben statt der Eingaben selbst. Ihre Aufbewahrungsdauer ist auf den Zweck begrenzt.

Gesetzlich oder betrieblich erforderliche Protokollierung ist nicht Gegenstand dieses ADR und wird gesondert geregelt.

Für Kennungen im Vertrag folgt daraus:

- **Vom Kernsystem vergebene Kennungen** werden unverändert durchgereicht und sind dauerhaft. Das gilt für die IDs von Aufgaben sowie für archiv_id und dokument_id. Ein Dokument wird deshalb über das Paar aus archiv_id und dokument_id bezeichnet; die Fassade muss kein Archiv zu einer Dokument-ID nachschlagen.
- **Kennungen, die das Kernsystem nicht in geeigneter Form bereitstellt,** vergibt die Fassade befristet, ohne dauerhafte Zuordnung. Das betrifft derzeit die id einer Person. Eine Implementierung kann sie beispielsweise als Cache-Eintrag mit Ablaufzeit oder als geschützten, selbsttragenden Wert mit eingebetteter Gültigkeit erzeugen; das Verfahren ist Implementierungsdetail.

Für befristete Kennungen gilt gegenüber Clients:

- Eine Kennung ist ab ihrer Ausgabe mindestens für eine im Vertrag zugesagte Mindestdauer gültig. Bei Personen gibt jede Suche eine wieder gültige id aus. Ob eine Nutzung die Gültigkeit verlängert, wird nicht zugesagt.
- Eine abgelaufene id einer Person wird mit person_nicht_gefunden beantwortet. Der Client ermittelt die Person erneut über eine Suche.
- Gleiche Kennungen bezeichnen denselben Datensatz. Unterschiedliche Kennungen schließen denselben Datensatz nicht aus; sie eignen sich daher nicht zum Abgleich über Suchen hinweg.
- Clients speichern befristete Kennungen nicht als dauerhaften Bezug. Für langlebige Bezüge auf Personen dienen fachliche Kennungen wie kvnr oder rvnr beziehungsweise die verwendeten Suchkriterien.

## Konsequenzen

Implementierungen bleiben schlank und zustandsarm. Datenschutzbewertung, Löschung und Abgleich bleiben beim Kernsystem. Zusammengeführte oder gelöschte Personendatensätze wirken sich spätestens mit Ablauf der ausgegebenen ids aus, ohne dass die Fassade Bestände nachziehen muss. Ein Wechsel des Archivs eines Dokuments ist für Clients nicht folgenlos, da archiv_id Teil der Dokumentreferenz ist.

Clients müssen mit abgelaufenen ids von Personen umgehen und Personen bei Bedarf erneut suchen. Langlaufende Abläufe und Agenten führen dafür die verwendeten Suchkriterien oder fachlichen Kennungen mit. Werte, die ausschließlich in der Fassade entstehen würden, etwa eigene Merklisten oder fachliche Zusatzattribute, können nicht Teil des Vertrags werden, solange das Kernsystem sie nicht hält. Neue Kennungen im Vertrag werden danach eingeordnet, ob das Kernsystem sie dauerhaft vergibt oder die Fassade sie befristet ausgeben muss.

Offen sind:

- die konkrete Mindestgültigkeit der id einer Person;
- die Zusage an Clients zur Aufbewahrungsdauer von Idempotenzangaben nach ADR-002.
