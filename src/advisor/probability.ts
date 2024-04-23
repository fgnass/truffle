import _ from "lodash";
import { DiceMap } from "./dicemap";

var facsCache: Record<number, number> = {}; // Will contain all cached factorials
var probCache = new DiceMap<number>(); // Will contain all cached probabilities

/**
 * Returns the probability of rolling the given dice.
 * @param dice The dice to calculate the probability for.
 * @returns The probability of rolling the given dice.
 */
export function getDiceProbability(dice: number[]): number {
  // Check if the result exists in the cache
  if (probCache.has(dice)) return probCache.get(dice);

  // Get the cardinality of the roll as an array
  var cardinality = _.values(_.countBy(dice));

  // Calculate the cardinality product of the dice
  var cdProd = cardinality.reduce((x, y) => x * fac(y), 1);

  // Calculate the dice probability and store it in the cache
  var prob = fac(dice.length) / (Math.pow(6, dice.length) * cdProd);

  probCache.add(dice, prob);

  return prob;
}

/**
 * Computes the n'th factorial.
 * @param n The number to compute the factorial for.
 * @returns The n'th factorial.
 */
function fac(n: number) {
  // 0! = 1
  if (n === 0) return 1;

  // Check if the result exists in the cache
  if (n in facsCache) return facsCache[n];

  // Calculate and store the result in the cache
  facsCache[n] = n * fac(n - 1);

  return facsCache[n];
}
