export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Hält die Platte einen LKW aus?',
    answer:
      'Die classicXtreme-Platten sind für Schwerlast ausgelegt; der Hersteller nennt eine Traglast von über 40 Tonnen. Ob der Untergrund darunter trägt, muss vor Ort geprüft werden – ein Foto ersetzt keine Prüfung der Tragfähigkeit.',
  },
  {
    question: 'Wie wird geliefert?',
    answer:
      'Die Platten kommen auf Paletten per Spedition. Wichtig ist die Entlademöglichkeit vor Ort: Stapler vorhanden, Kran nötig oder noch unklar. Diese Angabe fragen wir im Assistenten ab, damit die Lieferung passt.',
  },
  {
    question: 'Was kostet das?',
    answer:
      'Der Assistent zeigt eine vorläufige Mengenberechnung. Verlässliche Preise und Versandkosten gibt es erst mit vollständigen, geprüften Daten im persönlichen Angebot. Eine Anfrage ist noch keine Bestellung.',
  },
  {
    question: 'Brauche ich eine App?',
    answer:
      'Nein. Der Berater läuft direkt auf der Website, auf Handy, Tablet und Computer. Wer möchte, kann zusätzlich die App für Android und iPhone nutzen.',
  },
  {
    question: 'Muss ich ein Foto machen?',
    answer:
      'Nein, das Foto ist freiwillig. Es hilft nur bei der Einordnung des Untergrunds. Bitte fotografiere nur den Boden, keine Personen.',
  },
  {
    question: 'Kann ich Platten auch mieten?',
    answer:
      'Mietanfragen sind möglich und werden immer persönlich geprüft. Setze im Assistenten einfach den Schalter „Miete gewünscht“.',
  },
  {
    question: 'Spreche ich mit einer KI?',
    answer:
      'Im Chat „Fragen an den Berater“ ja – er ist als KI-Assistent gekennzeichnet. Er erklärt Produkte, Einsatz, Lieferung und Ablauf, nennt aber keine verbindlichen Preise. Mengen und Preise kommen aus festen Regeln, und jedes Angebot gibt ein Mensch frei.',
  },
  {
    question: 'Woraus bestehen die Platten?',
    answer:
      'Aus 100 % Recycling-Kunststoff, hergestellt in der EU. Sie schützen Rasen und Boden ohne Versiegelung und können nach dem Einsatz wieder aufgenommen werden.',
  },
];

/** Die vier Fragen der Startseite (Texte aus docs/design/Main.dc.html). */
export const FAQ_HOME: FaqItem[] = [
  {
    question: 'Hält die Platte einen LKW aus?',
    answer: 'Die Platte ist für bis zu 40 Tonnen ausgelegt. Ob dein Untergrund das trägt, prüft niemand per Foto. Bei Unsicherheit beraten wir persönlich.',
  },
  {
    question: 'Wie wird geliefert?',
    answer: 'Auf Paletten per Spedition. Wichtig ist, ob vor Ort ein Stapler da ist oder ein Kran gebraucht wird. Das fragen wir in der Anfrage ab.',
  },
  {
    question: 'Was kostet das?',
    answer: 'Der Rechner zeigt dir die Mengen sofort. Den Preis bekommst du nach kurzer Prüfung als Angebot, abhängig von Menge und Lieferort.',
  },
  {
    question: 'Spreche ich mit einer KI?',
    answer: 'Im Chat ja, das sagen wir dir gleich zu Beginn. Mengen und Preise rechnet die KI nicht aus, das machen feste Regeln. Angebote gibt immer ein Mensch frei.',
  },
];
