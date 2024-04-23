import _ from "lodash";
import { DiceMap } from "./dicemap";

// Generate all rolls and keepers available
const allRolls = dice(5);
const allKeepers = diceUpTo(5);

// Setup caches for keepers from all rolls, and rolls from all keepers
const keepersCache = new DiceMap<number[][]>();
const rollsCache = new DiceMap<number[][]>();

/**
 * Generates all possible rolls with 5 dice.
 * @returns All possible rolls with 5 dice.
 */
export function getAllRolls() {
  return allRolls;
}

/**
 * Generates all possible keepers, from 0 to 5 dice.
 * @returns All possible keepers.
 */
export function getAllKeepers() {
  return allKeepers;
}

/**
 * Generates all possible keepers from the given roll.
 * @param roll The roll to generate keepers for.
 * @returns All possible keepers from the given roll.
 */
export function getKeepers(roll: number[]) {
  // Check if the keepers are in the cache
  if (keepersCache.has(roll)) return keepersCache.get(roll);

  // Generate the keepers from the roll
  var keepers = _.uniqWith(powerset(roll), isSameDice);

  // Store the result in the cache for future lookups
  keepersCache.add(roll, keepers);

  return keepers;
}

/**
 * Generates all possible rolls from the given keepers.
 * @param keepers The keepers to generate rolls for.
 * @returns All possible rolls from the given keepers.
 */
export function getRolls(keepers: number[]) {
  // Check if the rolls are in the cache
  if (rollsCache.has(keepers)) return rollsCache.get(keepers);

  // Generate the remaining dice and attach them to the keepers
  var remDice = dice(5 - keepers.length);
  var rolls = remDice.map((x) => keepers.concat(x));

  // Store the result in the cache for future lookups
  rollsCache.add(keepers, rolls);

  return rolls;
}

/**
 * Evaluates if the two dice arrays are the same, equality is based
 * on their cardinality being the same.
 * @private
 * @param arr1 The first dice array.
 * @param arr2 The second dice array.
 * @returns {boolean} True if the two dice arrays are the same, false otherwise.
 */
function isSameDice(arr1: number[], arr2: number[]) {
  return _.isEqual(_.countBy(arr1), _.countBy(arr2));
}

/**
 * Generates all possible dice for the given size.
 * @private
 * @param size The size used for generating the dice.
 * @returns All possible dice for the given size.
 */
function dice(size: number) {
  const recurFn = (size: number, minValue: number) => {
    if (size === 0) return [[]];

    var output: number[][] = [];

    for (var i = minValue; i <= 6; i++) {
      var nextDice = recurFn(size - 1, i);
      var padded = nextDice.map((x) => _.concat(i, x));
      output = output.concat(padded);
    }

    return output;
  };

  return recurFn(size, 1);
}

/**
 * Generates all possible dice with the size from 0 to the given size.
 * @private
 * @param size The maximum size for the dice.
 */
function diceUpTo(size: number) {
  return _.flatten(_.range(size + 1).map((x) => dice(x)));
}

/**
 * Generates the powerset (all possible subsets) of the given array.
 * @param arr The array to generate the powerset for.
 * @returns The power of the given array.
 */
function powerset(arr: number[]): number[][] {
  if (arr.length === 0) return [[]];

  var rest = powerset(arr.slice(1));
  var combined = rest.map((x) => x.concat(arr[0]));

  return rest.concat(combined);
}
