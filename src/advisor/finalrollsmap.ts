import _ from "lodash";
import { DiceMap } from "./dicemap";
import { Scorecard, isValidCategory } from "./validator";
import { getAllRolls } from "./combinatorics";
import { StateMap } from "./statemap";
import { getCategoryScore } from "./score-calculator";

export class FinalRollsMap {
  rollsEV: DiceMap<number>;

  /**
   * Represents a map of final rolls and their EV's.
   * @param scorecard The scorecard used in constructing the final rolls.
   * @param upperScore The upper score used in constructing the final rolls.
   */
  constructor(scorecard: Scorecard, upperScore: number, stateMap: StateMap) {
    const rollsEV = new DiceMap<number>();
    // Loop through each possible roll and calculate their EV's
    getAllRolls().forEach((roll) => {
      var rollEV = 0; // Will contain the EV for this roll

      // Iterate through each unmarked category
      for (var i = 0; i < scorecard.length; i++) {
        // Skip marked categories
        if (scorecard[i] || !isValidCategory(i)) continue;
        // Find the new upper score from scoring in this category
        var categoryScore = getCategoryScore(i, roll);
        var isUpperCategory = i >= 0 && i <= 5;
        var newUpperScore = isUpperCategory
          ? upperScore + categoryScore
          : upperScore;

        // Calculate the category EV
        var newScorecard = markedScorecard(scorecard, i);
        var categoryEV =
          (stateMap.getEV(newScorecard, newUpperScore) ?? 0) + categoryScore;

        // Check if scoring the category results in the upper section bonus
        if (upperScore < 63 && newUpperScore >= 63) categoryEV += 35;

        // Check if this is the best EV for the category
        if (categoryEV > rollEV) rollEV = categoryEV;
      }

      // Store the EV for this roll
      rollsEV.add(roll, rollEV);
    });

    this.rollsEV = rollsEV;
  }

  /**
   * Returns the EV for the given roll.
   * @param roll The roll to look up EV for.
   * @returns The EV for the given roll.
   */
  getEV(roll: number[]) {
    return this.rollsEV.get(roll);
  }
}

/**
 * Clones the given scorecard and returns the clone with the marked category.
 * @private
 * @param scorecard The scorecard to clone.
 * @param i The category to mark as scored.
 * @returns The cloned scorecard with the marked category.
 */
function markedScorecard(scorecard: Scorecard, i: number) {
  var newScorecard = _.clone(scorecard);
  newScorecard[i] = true;
  return newScorecard;
}
