Open Farming Hackdays 2026
==========================

## Challenge

**Rewild the meadow**

## Authors 

Challenge Owner: 

- Niklaus Trottmann

Team: 

- Daniel Huber
- Robin Steiner
- Damian Oswald
- Lorin Semela
- Quirina Merz
- Alice Wieser
- Thérèse Schmutz
- Christoph Brunschwiler 


## User story

**Als** Martina, 28, Landwirtin EFZ
**möchte ich** eine neu gepachtete Fläche mit gezielten Massnahmen so vorbereiten,
**so dass** sich die Flächen für QII + Vernetzungsbeiträge qualifizieren.

## Spezifikationen

- Keine Beratung durch Personen, da Martina die kantonale Beratung schon gebraucht hat.
- Vorgeschlagene Massnahmen müssen
    - aktuell (basierend auf Gesetzesgrundlagen),
    - standortspezifisch,
    - wirksam und
    - kosteneffizient (gratis) sein.
- Vorgeschlagene Massnahmen müssen intuitiv erklärt sein.

## Martinas Problem

Ich habe

- keine Zeit,
- (gratis) Beratungslimite aufgebraucht,
- konservative Eltern,
- limitierte finanzielle Mittel,
- Versteht die Sprache der Auflagen in der DZV nicht,
- Lese nicht gerne die vielen, veralteten Merkblätter, die überall rumschwirren,
- fehlende Erfahrung bei der Bewirtschaftung von BFF-QII-Flächen,
- Angst, meine Beiträge zu verlieren, wenn sie Fehler in der Bewirtschaftung verliert.

## Flowchart

```mermaid
flowchart TD
    A{Anzahl Indikatorpflanzen} -->|mehr als 8| B(Note: Sehr gut)
    A -->|zwischen 6 - 8| C(Note: gut)
    A -->|weniger als 6| E[Anzahl zusätzliche Indikatoren]
    B --> Z(QII erreicht)
    C --> Z
    E --> F[Weitere Fragen]
    F --> G{mehr als 12 Punkte}
    G -->|Ja| H{Bewirtschaftungspotential?}
    G -->|Nein| I{Ansaatpotential:
    • Sonnenscheindauer
    • Bodenbeschaffenheit leicht oder mittelschwer
    • Ertragsniveau <= 80 dt TS / hektar
    • keine Problempflanzen Blacken und AKD}
    I -->|Ja| J[Ansaat sinvoll]
    I --> Y
    H -->|Bestandeslenkung gemäss Empfehlungen| Z
    J -->|Ansaat durchgeführt| Z
    H -->|Nein| Y(QII nicht erreicht)
```

## Render instructions file

The instructions file is composed from multiple markdown files and can be rendered with Quarto, using:

``` bash
quarto render docs/INSTRUCTIONS.qmd
```
