import _ from "lodash";
import {
  Settings,
  getBestCategory,
  getBestKeepersAdvice,
  initAdvisor,
} from "./advisor";
import { getCategoryScore } from "./score-calculator";
import { Scorecard } from "./validator";
import i18n from "../i18n/en";

/**
 * Initialize the module.
 * @param settings {Object} An object containing settings.
 */
export function initSimulator(initSettings: Settings) {
  initAdvisor(initSettings);
}

/**
 * Simulates a single game using the strategy implemented in the advisor module.
 * @memberof module:simulator
 * @return {number} The score of the yahtzee game.
 */
export function simulateGame() {
  // Initialize game state
  var scorecard = new Array(13).fill(false) as Scorecard,
    score = 0,
    upperScore = 0;

  // Loop over all the rounds in the game
  for (var i = 0; i < 13; i++) {
    // Simulate the round
    var result = simulateRound(scorecard, score, upperScore);
    // Extract the results
    scorecard = result.scorecard;
    score = result.score;
    upperScore = result.upperScore;
  }

  return score;
}

/**
 * Simulates a single round using the strategy implemented in the advisor module.
 * @param scorecard {boolean[]} The scorecard at the beginning of the round.
 * @param score {number} The score at the beginning of the round.
 * @param upperScore {number} The upper score at the beginning of the round.
 * @returns {{scorecard: Array, score: number, upperScore: number}} The new game state.
 */
export function simulateRound(
  scorecard: Scorecard,
  score: number,
  upperScore: number
) {
  // Go through two rounds of rolling dice
  var dice = rollDice(5);
  var firstKeepers = getBestKeepersAdvice(scorecard, upperScore, dice, 2);
  dice = rollRemainingDice(firstKeepers);
  var secondKeepers = getBestKeepersAdvice(scorecard, upperScore, dice, 1);
  dice = rollRemainingDice(secondKeepers);

  // Get the best category to score in and its score
  var category = getBestCategory(scorecard, upperScore, dice);
  var categoryScore = getCategoryScore(category, dice);

  // Get game state flags
  var isUpperCategory = category < 6;
  var triggersBonus =
    isUpperCategory && upperScore < 63 && upperScore + categoryScore >= 63;

  console.log(
    `Got ${categoryScore} in ${i18n.categoryNames[category]}`,
    triggersBonus ? "Bonus!" : ""
  );
  return {
    scorecard: markedScorecard(scorecard, category),
    score: score + categoryScore + (triggersBonus ? 35 : 0),
    upperScore: upperScore + (isUpperCategory ? categoryScore : 0),
  };
}

/**
 * Rolls a given number of dice and returns an arrary containing the result.
 * @private
 * @param  {number} size The number of dice to roll.
 * @return {number[]} An array containing the resulting dice.
 */
function rollDice(size: number) {
  return _.range(size).map((x) => Math.floor(Math.random() * 6) + 1);
}

/**
 * Takes the given dice and rolls the remaining (5 - dice.length) dice.
 * The result is the combination of the two.
 * @private
 * @param dice The dice to start out with.
 * @returns {Array} The merged roll with 5 dice.
 */
function rollRemainingDice(dice: number[]) {
  return _.concat(dice, rollDice(5 - dice.length));
}

/**
 * Clones the given scorecard and returns the clone with the marked category.
 * @private
 * @param scorecard {boolean[]} The scorecard to clone.
 * @param i {number} The category to mark as scored.
 * @returns {boolean[]} The cloned scorecard with the marked category.
 */
function markedScorecard(scorecard: Scorecard, i: number) {
  var newScorecard = _.clone(scorecard);
  newScorecard[i] = true;
  return newScorecard;
}
