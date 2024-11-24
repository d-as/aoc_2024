import * as U from './utils.js';
import { PUZZLE_COUNT } from './constants.js';

export const Assert = {
  validYear: (year: number): number => {
    if (
      year < 2015 ||
      year > U.getYear(new Date()) ||
      !Number.isInteger(year)
    ) {
      throw new Error(`Invalid year: ${year}`);
    }

    return year;
  },
  validDay: (day: number): number => {
    if (day < 1 || day > PUZZLE_COUNT || !Number.isInteger(day)) {
      throw new Error(`Invalid day: ${day}`);
    }

    return day;
  },
};
