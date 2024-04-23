import { getAllKeepers, getRolls } from "./combinatorics";
import { DiceMap } from "./dicemap";
import { getDiceProbability } from "./probability";
import { RollsMap } from "./rollsmap";

/**
 * Represents a map of keepers and their EV's.
 * @param nextRolls A map of the next rolls these keepers should refer to.
 * @constructor
 */
export class KeepersMap {
  keepersEV: DiceMap<number>;
  constructor(nextRolls: RollsMap) {
    var keepersEV = new DiceMap<number>();

    // Loop through each possible keepers and calculate their EV's
    getAllKeepers().forEach(function (keepers) {
      var evSum = 0; // Will contain the total EV for these keepers

      // Iterate through all possible rolls resulting from these keepers
      getRolls(keepers).forEach((roll) => {
        var remDice = subtractDice(roll, keepers);
        evSum += getDiceProbability(remDice) * nextRolls.getEV(roll);
      });

      // Store the EV for these keepers
      keepersEV.add(keepers, evSum);
    });

    this.keepersEV = keepersEV;
  }

  /**
   * Returns the EV for the given keepers.
   * @param keepers The keepers to look up EV for.
   * @returns The EV for the given keepers.
   */
  getEV(keepers: number[]) {
    return this.keepersEV.get(keepers);
  }
}

/**
 * Subtracts all dice in `b` from the dice in `a`. Essentially
 * a subtraction of cardinalities.
 * @private
 * @param a The first array.
 * @param b The second array that will subtracted from the first array.
 * @returns The difference between the two arrays.
 */
function subtractDice(a: number[], b: number[]) {
  var newDice = a.slice(0);

  for (var i = 0; i < b.length; i++) {
    for (var k = 0; k < newDice.length; k++) {
      if (newDice[k] == b[i]) {
        newDice.splice(k, 1);
        break;
      }
    }
  }

  return newDice;
}
