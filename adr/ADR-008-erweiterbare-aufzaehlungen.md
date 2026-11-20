# ADR-008: Erweiterbare Aufzählungen

Status: Angenommen für diesen Entwurf.

## Kontext

Der Vertrag verwendet Aufzählungen (enum) für fachliche Codes, etwa Buchungsarten, Kontostatus oder Aufgabenstatus. Fachliche Wertelisten wachsen erfahrungsgemäß: Kernsysteme führen neue Arten ein, oder bisher unter einem Sammelwert geführte Fälle erhalten einen eigenen Wert. Ein zusätzlicher Wert kann bei streng typisierten Clients, etwa mit generierten Aufzählungstypen oder strikter Schemavalidierung von Antworten, zu Fehlern führen und wäre ohne Vereinbarung eine inkompatible Änderung.

Alternativ ließen sich solche Felder als freie Zeichenfolge modellieren und die Werte nur beispielhaft nennen. Damit entfiele jedoch die maschinenlesbare Festlegung der bekannten Werte und ihrer Bedeutung, die Anwendungen und KI-Agenten für die Auswertung benötigen.

## Entscheidung

Fachliche Codes bleiben als Aufzählungen modelliert. Für deren Weiterentwicklung gilt:

- **Ergänzen ist kompatibel.** Eine Aufzählung darf jederzeit um neue Werte erweitert werden. Das ist keine inkompatible Vertragsänderung.
- **Entfernen ist inkompatibel.** Das Entfernen eines Werts ist eine inkompatible Vertragsänderung. Gleiches gilt für das Umbenennen eines Werts und für eine Änderung seiner Bedeutung, auch wenn ein Teil der bisher darunter geführten Fälle künftig einen neuen Wert erhält.
- **Clients tolerieren unbekannte Werte.** In Antworten müssen Clients mit Werten rechnen, die ihnen noch nicht bekannt sind. Sie dürfen eine Antwort deshalb nicht verwerfen und einen unbekannten Wert nicht als einen bekannten Wert deuten, insbesondere nicht als Sammelwert wie sonstige. Wie ein Client einen unbekannten Wert behandelt, etwa durch Anzeige des Codes oder Weiterleitung an eine manuelle Bearbeitung, entscheidet er selbst.

In Anfragen gelten ausschließlich die im Vertrag aufgeführten Werte; andere Werte werden wie bisher abgewiesen.

## Konsequenzen

Neue fachliche Werte lassen sich ohne inkompatible Version einführen. Clients mit generiertem Code sehen für Aufzählungen einen Rückfall für unbekannte Werte vor oder validieren Antworten nicht strikt gegen die Werteliste. Die Spec weist auf diese Regel hin, damit sie ohne ADR-Dateien nutzbar bleibt.

Werte, die entfallen sollen, können zunächst in der Beschreibung als veraltet gekennzeichnet werden, wie in ADR-006 für einzelne Aufzählungswerte vorgesehen. Ihre Entfernung bleibt eine inkompatible Vertragsänderung.

Wie Erweiterungen einzelner Krankenkassen oder Dienstleister außerhalb des gemeinsamen Vertrags gekennzeichnet und übernommen werden, regelt dieser ADR nicht; das bleibt Teil der offenen Regeln für Namensräume und Erweiterungen.
