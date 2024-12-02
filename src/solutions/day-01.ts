import * as U from '@src/utils.js';

const input = U.getInputLines(import.meta);

type ListPair = [number[], number[]];

const [list1, list2] = input
  .reduce(
    ([list1, list2], line) => {
      const [a, b] = line.split(/\s+/).map(Number);

      return [
        [...list1, a],
        [...list2, b],
      ] as ListPair;
    },
    [[], []] as ListPair,
  )
  .map(list => list.toSorted((a, b) => b - a));

const distances = list1.map((n, i) => Math.abs(n - list2[i]));

const totalDistance = distances.reduce((a, b) => a + b);

const similarity = list1
  .map(n => n * list2.filter(m => m === n).length)
  .reduce((a, b) => a + b);

U.logResults(totalDistance, similarity);
