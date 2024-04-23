import { ArgumentError } from "./argumenterror";

/**
 * Gets the score for the given category and roll.
 * @param category The category, a number between 0 and 14.
 * @param roll The 5-dice roll.
 * @returns The score for the given category and roll.
 */
export function getCategoryScore(category: number, roll: number[]) {
  // Get the score for the given category
  if (category >= 0 && category <= 5) {
    return getNumberOfDice(category + 1, roll) * (category + 1);
  } else if (category == 6) {
    return getThreeOfAKindScore(roll);
  } else if (category == 7) {
    return getFourOfAKindScore(roll);
  } else if (category == 8) {
    return getFullHouseScore(roll);
  } else if (category == 9) {
    return getSmallStraightScore(roll);
  } else if (category == 10) {
    return getLargeStraightScore(roll);
  } else if (category == 11) {
    return getYahtzeeScore(roll);
  } else if (category == 12) {
    return getChanceScore(roll);
  }
  throw new ArgumentError(`Invalid category: ${category}`);
}

/**
 * Returns the number of dice in the roll with the given face-value.
 * @param faceValue The face-value to check for.
 * @param roll The roll to search.
 * @returns The number of dice in the roll with the given face-value.
 */
function getNumberOfDice(faceValue: number, roll: number[]) {
  var numberOfDice = 0;

  for (var i = 0; i < roll.length; i++) {
    if (roll[i] == faceValue) numberOfDice++;
  }

  return numberOfDice;
}

/**
 * Returns the three-of-a-kind score for this roll.
 * @param roll The roll to check.
 * @returns The three-of-a-kind score for this roll.
 */
function getThreeOfAKindScore(roll: number[]) {
  for (var i = 1; i <= 6; i++) {
    if (getNumberOfDice(i, roll) >= 3) {
      return sumAll(roll);
    }
  }

  return 0;
}

/**
 * Returns the four-of-a-kind score for this roll.
 * @param roll The roll to check.
 * @returns The four-of-a-kind score for this roll.
 */
function getFourOfAKindScore(roll: number[]) {
  for (var i = 1; i <= 6; i++) {
    if (getNumberOfDice(i, roll) >= 4) {
      return sumAll(roll);
    }
  }

  return 0;
}

/**
 * Returns the small straight score for this roll.
 * @param roll The roll to check.
 * @returns The small straight score for this roll.
 */
function getSmallStraightScore(roll: number[]) {
  let seq = 0;
  for (let i = 1; i <= 6; i++) {
    if (getNumberOfDice(i, roll) > 0) {
      seq++;
      if (seq >= 4) return 30;
    } else {
      seq = 0;
    }
  }
  return 0;
}

/**
 * Returns the large straight score for this roll.
 * @param roll The roll to check.
 * @returns The large straight score for this roll.
 */
function getLargeStraightScore(roll: number[]) {
  let seq = 0;
  for (let i = 1; i <= 6; i++) {
    if (getNumberOfDice(i, roll) > 0) {
      seq++;
      if (seq >= 5) return 40;
    } else {
      seq = 0;
    }
  }
  return 0;
}

/**
 * Returns the full house score for this roll.
 * @param roll The roll to check.
 * @returns The full house score for this roll.
 */
function getFullHouseScore(roll: number[]) {
  var twoOfAKindDiceValue = 0;
  var threeOfAKindDiceValue = 0;

  for (var i = 1; i <= 6; i++) {
    if (getNumberOfDice(i, roll) == 3) {
      threeOfAKindDiceValue = i;
    } else if (getNumberOfDice(i, roll) == 2) {
      twoOfAKindDiceValue = i;
    }
  }

  if (twoOfAKindDiceValue > 0 && threeOfAKindDiceValue > 0) {
    return 25;
  }

  return 0;
}

/**
 * Returns the chance score for this roll.
 * @param roll The roll to check.
 * @returns The chance score for this roll.
 */
function getChanceScore(roll: number[]) {
  return sumAll(roll);
}

/**
 * Returns the yahtzee score for this roll.
 * @param roll The roll to check.
 * @returns The yahtzee score for this roll.
 */
function getYahtzeeScore(roll: number[]) {
  for (var i = 1; i <= 6; i++) {
    if (getNumberOfDice(i, roll) == 5) {
      return 50;
    }
  }

  return 0;
}

function sumAll(roll: number[]) {
  return roll.reduce((x, y) => {
    return x + y;
  }, 0);
}
