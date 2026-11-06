# ADR-001: Ressourcenorientierung und HTTP-Semantik

Status: Angenommen für diesen Entwurf.

## Kontext

Ein einheitlicher fachlicher Zugang soll mit üblichen HTTP-Clients verständlich und verlässlich nutzbar sein. REST ist ein Architekturstil; die konkrete Methodensemantik wird durch HTTP festgelegt.

## Entscheidung

Endpunkte werden möglichst ressourcenorientiert gestaltet. Pfade benennen Ressourcen und Beziehungen, Sammlungen im Plural. Operationen nutzen die HTTP-Methoden ihrer Semantik entsprechend: GET und HEAD zum Lesen, POST zur Verarbeitung oder zum Anlegen, PUT zum vollständigen Setzen, PATCH für Teiländerungen und DELETE zum Entfernen der Zuordnung einer Ressource zur URI. Statuscodes, Header und Medientypen passen zur Operation. Anfragen enthalten ihren erforderlichen Kontext und benötigen keine vorausgehende Serversitzung.

Lesende Suchen verwenden bevorzugt GET. POST /personen/suche bleibt eine begründete Ausnahme für ein strukturiertes Suchobjekt mit kombinierten Kriterien. Sie erzeugt keine Suchressource und hat keine fachliche Schreibwirkung. Die Operation wird ausdrücklich dokumentiert; allgemeine HTTP-Clients dürfen daraus keine generelle Idempotenz von POST ableiten.

## Konsequenzen

Es werden keine generischen Aktionsendpunkte anstelle sinnvoller Ressourcen eingeführt. Zusätzliche HTTP-Methoden oder Hypermedia-Mechanismen werden bei Bedarf ausgestaltet; dieser Entwurf behauptet keine vollständige Umsetzung aller REST-Eigenschaften. Schreibende Ressourcen sind bei konkretem Bedarf zulässig.

## Grundlagen

- [HTTP-Semantik, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)
- [PATCH, RFC 5789](https://www.rfc-editor.org/rfc/rfc5789.html)
