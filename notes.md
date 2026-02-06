Der User wird gefragt, welche Zeigerpflanzen auf seiner Wiese vorkommen. Dafür werden nur die Objekte aus `plants.json` angezeigt, die `"is_q2" = true` haben.

- Wenn mehr als 8 Zeigerpflanzen, ist es *deutlich* Q2.
  --> User Journey endet mit einem "sehr gut", es werden minimale Massnahmen vorgeschlagen, um bei diesem Niveau zu bleiben.

- Wenn es 6 oder 7 Zeigerpflanzen, ist es knapp Q2.
  --> User Journey endet mit einem "gut", es werden  Massnahmen vorgeschlagen, um bei diesem Niveau zu bleiben.

- Wenn es nicht Q2 ist, dann muss bestimmt werden, welche Potenzial-Punktzahl die Wiese erhält.

Die Punktzahl wird erst gerechnet, wenn nötig; also im letzten Fall. Für die Punktzahl-Berechnung werden:

1. Nochmals weitere Pflanzen abgefragt, und zwar diejenigen, die `"is_q2" = false` haben. Jede Pflanze gibt einen Punkt.

2. Zusätzlich werden die Fragen gestellt:

  a. Kann durch gezielte Bewirtschaftung Q2 erreicht werden (hat Bewirtschaftungspotenzial). Das beinhaltet, bestehenden Bestand in die richtige Richtung zu lenken. Mit Massnahmen wir Schnittzeitpunkt, Bodenheubereitung (d.h. nicht silieren), letzte Nutzungs so spät wie möglich sodass Bestand "tief" in den Winter geht, Herbstweide (senkt Bestand im Herbst zusätzlich), Frühschnitt *oder* Frühbeweidung. --> Bei allen Massnahmen geht es um Grassunterdrückung und Blumenförderung.
  
  b. Oder es gibt kein Bewirtschaftungspotenzial. Dann muss geprüft werden, ob ein Ansaatpotenzial besteht. Das Ansaatpotenzial wird geprüft, indem

  - Exposition (Hangausrichtung) --> Wenn schattig, kein Potenzial
  - Feuchtigkeitshaushalt --> Wenn feucht, kein Potenzial
  - Ertragsniveau des Bestandes --> Wenn mehr als 80 dt TS pro Jahr, kein Potenzial.

  Ausserdem wichtig, wenn es Blacken oder Ackerkratzdisteln hat (weil wenn ich da ansäe, keimen grosse Mengen schlafender Blackensamen) dann besteht *sicher* kein Ansaatpotenzial, wegen zu grosser Gefahr.