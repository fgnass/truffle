import _ from "lodash";

export class DiceMap<V> {
  map: Record<string, V> = {};

  /**
   * Represents a map from dice to a value. The dice
   * acts as keys and are stored based on their cardinality.
   * @constructor
   */
  constructor() {}

  /**
   * Adds the given value to the map with the given dice as key.
   * @param dice The dice to use as key.
   * @param value The value to store.
   */
  add(dice: number[], value: V) {
    this.map[key(dice)] = value;
  }

  /**
   * Retrieves the value for the given dice.
   * @param dice The dice to use as key.
   * @returns The value stored for the given dice.
   */
  get(dice: number[]) {
    return this.map[key(dice)];
  }

  /**
   * Checks if the given dice exists as a key in the map.
   * @param dice The dice to use as key.
   * @returns True if the key exists, false otherwise.
   */
  has(dice: number[]) {
    return key(dice) in this.map;
  }

  /**
   * Returns the size of this map.
   */
  size() {
    return _.size(this.map);
  }
}

/**
 * Generates a key based on the cardinality of the given dice.
 * @private
 * @param dice The dice to generate a key for.
 * @returns The key representing the given dice.
 */
function key(dice: number[]) {
  var key = new Array(6).fill(0);
  var countMap = _.countBy(dice);
  return key.map((_val, i) => (countMap[i + 1] ? countMap[i + 1] : 0)).join("");
}
