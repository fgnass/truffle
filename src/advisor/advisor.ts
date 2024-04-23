import _ from "lodash";
import { ArgumentError } from "./argumenterror";
import { getKeepers } from "./combinatorics";
import { FinalRollsMap } from "./finalrollsmap";
import { InitializationError } from "./initializationerror";
import { KeepersMap } from "./keepersmap";
import { RollsMap } from "./rollsmap";
import { StateMap } from "./statemap";
import {
  Category,
  Scorecard,
  isValidCategory,
  isValidDice,
  isValidRollsLeft,
  isValidScorecard,
  isValidUpperScore,
} from "./validator";
import { getCategoryScore } from "./score-calculator";

export type Settings = {
  stateMap: Record<string, Record<number, number>>;
};

// The StateMap used for EV lookups
var stateMap: StateMap;

/**
 * Initialize the module.
 * @param settings An object containing settings.
 */
export function initAdvisor(initSettings: unknown) {
  if (!isValidSettings(initSettings))
    throw new ArgumentError("Invalid settings: " + initSettings);
  stateMap = new StateMap(initSettings.stateMap);
}

/**
 * Checks if the given settings are valid.
 * @private
 * @param settings {Object} The settings to check.
 * @returns {boolean} True if the settings are valid, false otherwise.
 */
function isValidSettings(settings: unknown): settings is Settings {
  // Check overall settings
  if (typeof settings !== "object") return false;
  if (!settings) return false;

  // Check stateMap entry in settings
  if (!("stateMap" in settings)) return false;
  if (settings.stateMap !== Object(settings.stateMap)) return false;
  if (Array.isArray(settings.stateMap)) return false;

  return true;
}

/**
 * Returns the best keepers to choose from the given game state.
 * @memberof module:advisor
 * @param scorecard {boolean[]} The scorecard represented as a 15-integer array.
 * @param upperScore {number} The upper score.
 * @param dice {number[]} The 5 dice currently held by the player.
 * @param rollsLeft {number} The number of rolls left before scoring.
 * @returns {Array.<number>} The best keepers to choose from the given game state.
 */
export function getBestKeepersAdvice(
  scorecard: Scorecard,
  upperScore: number,
  dice: number[],
  rollsLeft: number
): number[] {
  // Check that module has been initialized
  if (!stateMap)
    throw new InitializationError("Module has not been initialized via init()");

  // Validate inputs
  if (!isValidScorecard(scorecard))
    throw new ArgumentError("Invalid scorecard: " + scorecard);
  if (!_.includes(scorecard, false))
    throw new ArgumentError("Scorecard is full: " + scorecard);
  if (!isValidUpperScore(upperScore))
    throw new ArgumentError("Invalid upper score: " + upperScore);
  if (!isValidDice(dice)) throw new ArgumentError("Invalid dice: " + dice);
  if (!isValidRollsLeft(rollsLeft))
    throw new ArgumentError("Invalid rolls left: " + rollsLeft);

  // Generate the final rolls for this state
  var finalRollsMap = new FinalRollsMap(scorecard, upperScore, stateMap);

  // Generate the second keepers based on the final rolls
  var secondKeepers = new KeepersMap(finalRollsMap);

  // If rollsLeft=1 then the best keepers among the second keepers are selected
  if (rollsLeft === 1) return getBestKeepers(dice, secondKeepers);

  // Generate the second rolls based on the second keepers
  var secondRolls = new RollsMap(secondKeepers);

  // Generate the first keepers based on the second rolls
  var firstKeepers = new KeepersMap(secondRolls);

  // // If rollsLeft=2 then the best keepers among the first keepers are selected
  if (rollsLeft === 2) return getBestKeepers(dice, firstKeepers);

  return dice;
}

/**
 * Retrieves the best keepers from the given roll in the given map
 * of keepers and their EV's.
 * @private
 * @param roll The roll from which the best keepers will be selected.
 * @param allKeepers A map of keepers and their associated EV.
 * @returns The best keepers to select from the given roll.
 */
function getBestKeepers(roll: number[], allKeepers: KeepersMap) {
  var bestKeepers: number[] = [];
  var bestKeepersEV = 0;

  // Iterate through all possible keepers from this roll
  getKeepers(roll).forEach(function (keepers) {
    var keepersEV = allKeepers.getEV(keepers);
    if (keepersEV >= bestKeepersEV) {
      bestKeepersEV = keepersEV;
      bestKeepers = keepers;
    }
  });

  return bestKeepers;
}

/**
 * Returns the best category to score in from the given game state.
 * @memberof module:advisor
 * @param scorecard The scorecard represented as a boolean array.
 * @param upperScore The upper score.
 * @param dice The 5 dice currently held by the player.
 * @returns The best category to score in from the given game state.
 */
export function getBestCategory(
  scorecard: Scorecard,
  upperScore: number,
  dice: number[]
): Category {
  // Check that module has been initialized
  if (!stateMap)
    throw new InitializationError("Module has not been initialized via init()");

  // Validate inputs
  if (!isValidScorecard(scorecard))
    throw new ArgumentError("Invalid scorecard: " + scorecard);
  if (!isValidUpperScore(upperScore))
    throw new ArgumentError("Invalid upper score: " + upperScore);
  if (!_.includes(scorecard, false))
    throw new ArgumentError("Scorecard is full: " + scorecard);
  if (!isValidDice(dice)) throw new ArgumentError("Invalid dice: " + dice);

  // Initialize variables to keep track of the best possible category
  var bestCategory: Category = 0,
    bestCategoryEV = 0;

  // Iterate through each unmarked category
  for (var i = 0; i < scorecard.length; i++) {
    // Skip marked categories
    if (scorecard[i] || !isValidCategory(i)) continue;

    // Create a new scorecard where the category is marked
    var newScorecard = markedScorecard(scorecard, i);

    // Find the new upper score from scoring in this category
    var categoryScore = getCategoryScore(i, dice);
    var isUpperCategory = i >= 0 && i <= 5;
    var newUpperScore = isUpperCategory
      ? upperScore + categoryScore
      : upperScore;

    // Calculate the category EV
    var categoryEV =
      (stateMap.getEV(newScorecard, newUpperScore) ?? 0) + categoryScore;

    // Check if scoring the category results in the upper section bonus
    if (upperScore < 63 && newUpperScore >= 63) categoryEV += 35;

    // Check if this is the best category so far
    if (categoryEV >= bestCategoryEV) {
      bestCategory = i;
      bestCategoryEV = categoryEV;
    }
  }

  return bestCategory;
}

/**
 * Clones the given scorecard and returns the clone with the marked category.
 * @param scorecard The scorecard to clone.
 * @param i The category to mark as scored.
 * @returns The cloned scorecard with the marked category.
 */
function markedScorecard(scorecard: Scorecard, i: number) {
  var newScorecard = _.clone(scorecard);
  newScorecard[i] = true;
  return newScorecard;
}
