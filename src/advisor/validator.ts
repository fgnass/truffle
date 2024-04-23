import _ from "lodash";

export const categories = _.range(12);

export type Scorecard = [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
];

/**
 * Checks if the given die is an integer between 1 and 6.
 * @param die The die to check.
 * @returns True if the die is valid, false otherwise.
 */
export function isValidDie(die: unknown): die is number {
  if (typeof die !== "number") return false;
  if (!Number.isInteger(die)) return false;
  if (die < 1 || die > 6) return false;
  return true;
}

/**
 * Checks if the given dice is an array containing valid dice.
 * @param dice The dice to check.
 * @returns True if the dice are valid, false otherwise.
 */
export function isValidDice(dice: unknown): dice is number[] {
  if (!Array.isArray(dice)) return false;
  return dice.every(isValidDie);
}

/**
 * Checks if the given roll is an array of size 5 containing valid dice.
 * @param roll The roll to check.
 * @returns True if the roll is valid, false otherwise.
 */
export function isValidRoll(roll: unknown): roll is number[] {
  if (!isValidDice(roll)) return false;
  if (roll.length != 5) return false;
  return true;
}

/**
 * Checks if the given category is an integer between 0 and 14.
 * @param category The category to check.
 * @returns True if the category is valid, false otherwise.
 */
export function isValidCategory(category: unknown) {
  if (typeof category !== "number") return false;
  if (!Number.isInteger(category)) return false;
  if (category < 0 || category > 12) return false;
  return true;
}

/**
 * Checks if the given scorecard is an array of size 15 with boolean values.
 * @param scorecard The scorecard to check.
 * @returns True if the scorecard is valid, false otherwise.
 */
export function isValidScorecard(scorecard: unknown): scorecard is Scorecard {
  if (!Array.isArray(scorecard)) return false;
  if (!scorecard.every((x) => typeof x === "boolean")) return false;
  if (scorecard.length != 13) return false;
  return true;
}

/**
 * Checks if the given upper score is a positive integer (0 also allowed).
 * @param upperScore The upper score to check.
 * @returns True if the upper score is valid, false otherwise.
 */
export function isValidUpperScore(upperScore: unknown) {
  if (typeof upperScore !== "number") return false;
  if (!Number.isInteger(upperScore)) return false;
  if (upperScore < 0) return false;
  return true;
}

/**
 * Checks if the given EV is a positive number between 0 and 63.
 * @param ev The EV to check.
 * @returns True if the EV is valid, false otherwise.
 */
export function isValidEV(ev: unknown) {
  if (typeof ev !== "number") return false;
  if (isNaN(ev)) return false;
  if (ev < 0) return false;
  if (ev > 404) return false;
  return true;
}

/**
 * Checks if the given rolls left is a positive integer between 1 and 2.
 * @param rollsLeft The rolls left to check.
 * @returns True if the rolls left is valid, false otherwise.
 */
export function isValidRollsLeft(rollsLeft: unknown) {
  if (!Number.isInteger(rollsLeft)) return false;
  if (rollsLeft !== 1 && rollsLeft !== 2) return false;
  return true;
}
