import * as U from './utils.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Assert } from './assert.js';

import {
  INPUT_PATH,
  PUZZLE_COUNT,
  SECOND_MILLISECONDS,
  SOLUTIONS_PATH,
  SOLUTION_PREFIX,
  SOLUTION_TEMPLATE_PATH,
} from './constants.js';

dotenv.config();

let { SESSION_COOKIE } = process.env;

if (!SESSION_COOKIE) {
  console.log('Missing SESSION_COOKIE in .env');
}

const [yearArg] = process.argv.slice(2, 3).map(Number);

const currentDate = new Date();
const currentYear = U.getYear(currentDate);

const year = Assert.validYear(U.isValue(yearArg) ? yearArg : currentYear);

const releasedPuzzleCount = U.getReleasedPuzzleCount(
  year < currentYear ? new Date(`${year}-12-31`) : currentDate,
);

const inputFiles = fs.readdirSync(INPUT_PATH);

console.log('Advent of Code', year);

if (year === currentYear) {
  console.log('Current date:', U.formatDate(currentDate));
  console.log('Released puzzles:', `${releasedPuzzleCount}/${PUZZLE_COUNT}`);

  if (releasedPuzzleCount > 0) {
    console.log(
      'Latest puzzle:',
      `https://adventofcode.com/${year}/day/${releasedPuzzleCount}`,
    );
  }

  if (releasedPuzzleCount < PUZZLE_COUNT) {
    console.log(
      'Next puzzle in:',
      U.getNextPuzzleText(currentDate, releasedPuzzleCount),
    );
  }
}

const inputFilesToBeFetched = U.range(releasedPuzzleCount, 1).filter(
  day => !U.inputFileExists(day, inputFiles),
);

if (SESSION_COOKIE && inputFilesToBeFetched.length > 0) {
  console.log(
    `Fetching ${inputFilesToBeFetched.length} input file${U.plural(
      inputFilesToBeFetched,
    )}`,
  );

  let invalidSessionCookie = false;

  Promise.all(
    inputFilesToBeFetched.map(day =>
      fetch(U.getInputURL(year, day), {
        headers: {
          Cookie: `session=${SESSION_COOKIE}`,
        },
      }),
    ),
  ).then(responses => {
    responses.forEach((response, i) => {
      response.text().then(input => {
        if (input.startsWith('Please')) {
          if (!invalidSessionCookie) {
            invalidSessionCookie = true;
            console.log('Invalid session cookie');
          }
        } else {
          fs.writeFileSync(
            path.join(INPUT_PATH, U.getInputFileName(inputFilesToBeFetched[i])),
            input,
          );
        }
      });
    });
  });
}

const runLatestSolution = async (allowRetry = true): Promise<void> => {
  const solutionFiles = fs.readdirSync(SOLUTIONS_PATH);

  const solutionFilesToBeCreated = U.range(releasedPuzzleCount, 1)
    .filter(day => !U.solutionFileExists(day, solutionFiles))
    .map(U.getSolutionFileName);

  if (solutionFilesToBeCreated.length > 0 && year === currentYear) {
    const template = fs.readFileSync(SOLUTION_TEMPLATE_PATH);

    console.log(
      `Creating ${solutionFilesToBeCreated.length} solution file${U.plural(
        solutionFilesToBeCreated,
      )}`,
    );

    solutionFilesToBeCreated.forEach(solution =>
      fs.writeFileSync(path.join(SOLUTIONS_PATH, solution), template),
    );
  }

  const sortByFileName = (a: string, b: string) =>
    U.getDayFromFilename(b) - U.getDayFromFilename(a);

  const [latestSolution] = fs
    .readdirSync(SOLUTIONS_PATH)
    .filter(file => file.match(new RegExp(`${SOLUTION_PREFIX}\\d{2}`)))
    .sort(sortByFileName);

  if (latestSolution) {
    const inputFileExists = fs.existsSync(
      path.join(
        INPUT_PATH,
        U.getInputFileName(U.getDayFromFilename(latestSolution)),
      ),
    );

    if (inputFileExists) {
      console.log(`Executing ${latestSolution}:\n`);

      exec(
        `tsx ${path.join(SOLUTIONS_PATH, latestSolution)}`,
        (error, stdout, stderr) => {
          if (error) {
            return console.error(error);
          } else if (stdout) {
            console.log(stdout);
          } else if (stderr) {
            console.error(stderr);
          }
        },
      );
    } else {
      if (allowRetry) {
        console.log('Missing input file, trying again in 1 second');
        await U.sleep(SECOND_MILLISECONDS);
        runLatestSolution(false);
      } else {
        console.log('Missing input file');
      }
    }
  } else {
    console.log('No solutions found');
  }
};

runLatestSolution();
