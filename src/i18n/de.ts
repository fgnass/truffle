import { I18n } from ".";

const i18n: I18n = {
  categoryNames: [
    "Einer",
    "Zweier",
    "Dreier",
    "Vierer",
    "Fünfer",
    "Sechser",
    "Dreier\u00adpasch",
    "Vierer\u00adpasch",
    "Full House",
    "Kleine Straße",
    "Große Straße",
    "Kniffel",
    "Chance",
  ],
  start: "Start",
  virtualDice: "Virtuelle Würfel",
  roundX: (x: number) => `Runde ${x}`,
  rollX: (x: number) => `Wurf ${x}`,
  playerX: (x: number) => `Spieler ${x}`,
  bonus: "Bonus",
  rollDice: "Würfeln",
  reRollAll: "Alle nochmal würfeln",
  rollXDice: (x: number) =>
    x === 1 ? `Einen Würfel würfeln` : `${x} Würfel würfeln`,
  perfect: "Perfekt!",
  playAgain: "Nochmal spielen",
  newGame: "Neues Spiel",
  numberOfPlayers: "Anzahl Spieler",
  computerPlayer: "Gegen Piggy spielen",
  nextPlayer: "Nächster Spieler",
  selectKeepers: "Wähle die Würfel, die Du behalten möchtest.",
  pickCategory: "Wähle eine Kategorie für deine Punkte aus.",
  clickDiceToEnterRoll:
    "Klick auf die Würfel, um einzutragen was gewürfelt wurde:",
  shareWithFriends: "Die App mit Freunden teilen",
};

export default i18n;
