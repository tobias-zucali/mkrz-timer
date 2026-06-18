---
title: Datenschutz
description: Informationen zum Datenschutz und zum Umgang mit Daten bei mkrz timer.
---

# Datenschutz

mkrz timer ist so konzipiert, dass es ohne die Erstellung eines Kontos genutzt werden kann.

Das Projekt zielt darauf ab, den Umgang mit Daten verständlich, transparent und datenschutzbewusst zu gestalten.

## Lokale Timer

Sie können mkrz timer vollständig in Ihrem Browser nutzen.

Bei Verwendung eines lokalen Timers:

- ist kein Konto erforderlich
- wird keine Live-Sitzung erstellt
- bleiben die Timer-Daten auf Ihrem Gerät
- wird kein Timer-Status an den Synchronisations-Relay gesendet

Die Anwendung speichert möglicherweise eine geringe Menge an Informationen im Browserspeicher, um Funktionen und Komfortmerkmale zu unterstützen.

Dazu gehören derzeit:

- wiederhergestellte lokale Timer-Einträge in `timer.localLibrary`
- Einstellungen für die Einbindung von Nicht-Standard-Einstellungen in geteilte Links in `timer.share.includeVoiceSoundSettings`

Die aktuelle Implementierung speichert keine Zugriffstoken für Live-Sitzungen in `localStorage`.

## Live-Sitzungen

mkrz timer unterstützt auch Live-Sitzungen, die es ermöglichen, mehrere Geräte synchron zu halten.

Bei der Verwendung von Live-Sitzungen:

- wird der Timer-Status über den Relay-Dienst synchronisiert
- kann ein Beitrittslink mit den Teilnehmern geteilt werden
- wird ein Verwaltungslink zur Steuerung der Sitzung verwendet
- kann jeder mit dem entsprechenden Link auf die Sitzung zugreifen

Diese Links dienen als Zugangsdaten und sollten entsprechend behandelt werden.

## Serverseitige Verarbeitung

Der Synchronisations-Relay speichert derzeit aktive Sitzungsdaten im Arbeitsspeicher, während die Sitzungen laufen.

Dies kann Folgendes umfassen:

- den synchronisierten Timer-Status
- für die Synchronisation erforderliche Teilnehmerinformationen
- Beitritts- und Verwaltungstoken
- für die Sitzungswiederherstellung erforderliche Betriebsmetadaten

Das Projekt nutzt derzeit keine dedizierte Datenbank für den normalen Betrieb von Live-Sitzungen.

## Infrastruktur

Die gehostete Infrastruktur wird derzeit innerhalb der Europäischen Union betrieben.

Die Relay-Infrastruktur wird derzeit in Frankfurt, Deutschland, gehostet.

## Kein Fokus auf Werbung oder Tracking

mkrz timer ist nicht als Werbe- oder Verhaltens-Tracking-Plattform gedacht.

Wir beabsichtigen derzeit nicht, Werbeprofile, Verhaltensanalysesysteme oder Personalisierungssysteme rund um die Anwendung aufzubauen.

## Open-Source-Transparenz

Der Quellcode ist öffentlich auf [GitHub](https://github.com/tobias-zucali/mkrz-timer) verfügbar.

Der Open-Source-Charakter des Projekts soll das technische Verhalten leichter verständlich und überprüfbar machen.

## Ihre Möglichkeiten

Sie können:

- ausschließlich lokale Timer verwenden
- Live-Sitzungen vermeiden
- den Browserspeicher über Ihre Browsereinstellungen löschen
- die Nutzung des gehosteten Dienstes jederzeit einstellen

## Kontakt

Fragen, Feedback oder Bedenken zum Datenschutz sind willkommen.

Kontaktinformationen finden Sie auf der Seite [Kontakt](/contact).
