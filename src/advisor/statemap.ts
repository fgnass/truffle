import _ from "lodash";
import { Scorecard } from "./validator";

export class StateMap {
  /**
   * Represents a new empty StateMap.
   */
  constructor(public map: Record<string, Record<number, number>> = {}) {}

  /**
   * Returns the stored EV for the given scorecard and upper score pair.
   * @param scorecard The scorecard to lookup EV for.
   * @param upperScore The upper score to lookup EV for.
   * @returns The EV for the given scorecard and upper score pair,
   * or null if no EV entry exists.
   */
  getEV(scorecard: Scorecard, upperScore: number) {
    // Generate the scorecard key
    const key = scorecardToString(scorecard);

    // Cap the upper score at 63 (anything above doesn't matter)
    if (upperScore > 63) upperScore = 63;

    // Check if the entry exists
    if (!(key in this.map) || !(upperScore in this.map[key])) return null;

    return this.map[key][upperScore];
  }

  /**
   * Stores the given EV for the given scorecard and upper score pair.
   * @param scorecard The scorecard to store the EV for.
   * @param upperScore The upper score to store the EV for.
   * @param ev The EV to store for the scorecard and upper score pair.
   */
  addEV(scorecard: Scorecard, upperScore: number, ev: number) {
    // Generate the scorecard key
    const key = scorecardToString(scorecard);

    // Cap the upper score at 63 (anything above doesn't matter)
    if (upperScore > 63) upperScore = 63;

    // Initialize the scorecard entry if needed
    if (!(key in this.map)) this.map[key] = {};

    // Store the EV entry
    this.map[key][upperScore] = ev;
  }

  /**
   * Retrieves the total number of states saved in this StateMap.
   * @returns The total number of states saved in this StateMap.
   */
  size() {
    return _.keys(this.map).reduce(
      (prev, curr) => prev + _.size(this.map[curr]),
      0
    );
  }

  /**
   * Converts this StateMap into JSON format.
   * @returns A JSON object representing this map.
   */
  toJSON() {
    return this.map;
  }
}

/**
 * Generates a string representation of the given scorecard array.
 * @param scorecard The scorecard that used for the string representation.
 * @returns A string representation of the given scorecard array.
 */
function scorecardToString(scorecard: Scorecard) {
  return scorecard.map((x) => (x ? 1 : 0)).join("");
}
