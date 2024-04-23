import { getAllRolls, getKeepers } from "./combinatorics";
import { DiceMap } from "./dicemap";
import { KeepersMap } from "./keepersmap";

/**
 * Represents a map of rolls and their EV's.
 * @param nextKeepers A map of the next keepers these rolls should refer to.
 * @constructor
 */
export class RollsMap {
  rollsEV: DiceMap<number>;

  constructor(nextKeepers: KeepersMap) {
    var rollsEV = new DiceMap<number>();

    // Iterate through all possible rolls and calculate their EV's
    getAllRolls().forEach(function (roll) {
      var ev = 0;

      // Iterate through all possible keepers resulting from this roll
      getKeepers(roll).forEach(function (keepers) {
        var keepersEV = nextKeepers.getEV(keepers);
        if (keepersEV >= ev) ev = keepersEV;
      });

      rollsEV.add(roll, ev);
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
