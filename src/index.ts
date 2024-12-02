import * as U from './utils.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { spawn } from 'child_process';
import { Assert } from './assert.js';

import {
  INPUT_PATH,
  PUZZLE_COUNT,
  SECOND_MILLISECONDS,
  SOLUTIONS_PATH,
  SOLUTION_PREFIX,
  SOLUTION_TEMPLATE_PATH,
} from './constants.js';

let { SESSION_COOKIE } = process.env;

if (!SESSION_COOKIE) {
  console.log('Missing SESSION_COOKIE in .env');
}

const currentDate = new Date();
const currentYear = U.getYear(currentDate);

const { year, watch, create } = yargs(hideBin(process.argv))
  .version(false)
  .option('year', {
    alias: 'y',
    type: 'number',
    default: currentYear,
    description: 'Advent of Code year',
  })
  .option('watch', {
    alias: 'w',
    type: 'boolean',
    default: false,
    description: 'Enables watch mode',
  })
  .option('create', {
    alias: 'c',
    type: 'boolean',
    default: true,
    description: 'Create missing solution files',
  })
  .parseSync();

Assert.validYear(year);

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

    if (create) {
      console.log(
        `Creating ${solutionFilesToBeCreated.length} solution file${U.plural(
          solutionFilesToBeCreated,
        )}`,
      );

      solutionFilesToBeCreated.forEach(solution =>
        fs.writeFileSync(path.join(SOLUTIONS_PATH, solution), template),
      );
    }
  }

  const sortByFileName = (a: string, b: string) =>
    U.getDayFromFilename(b) - U.getDayFromFilename(a);

  const [latestSolution] = fs
    .readdirSync(SOLUTIONS_PATH)
    .filter(file => file.match(new RegExp(`${SOLUTION_PREFIX}\\d{2}`)))
    .sort(sortByFileName);

  if (latestSolution) {
    const inputFile = U.getInputFileName(U.getDayFromFilename(latestSolution));
    const inputFileExists = fs.existsSync(path.join(INPUT_PATH, inputFile));

    if (inputFileExists) {
      console.log(`Executing ${latestSolution}:\n`);

      const solutionProcess = spawn(
        'tsx',
        [
          watch ? 'watch' : undefined,
          path.join(SOLUTIONS_PATH, latestSolution),
        ].filter(U.isValue),
        {
          stdio: 'pipe',
          shell: true,
        },
      );

      solutionProcess.stdout.on('data', data => {
        console.log(data.toString());
      });

      solutionProcess.stderr.on('data', data => {
        console.error(data.toString());
      });
    } else {
      const missingInputMessage = U.missingInputMessage(inputFile);

      if (allowRetry) {
        console.error(`${missingInputMessage}, trying again in 1 second`);

        await U.sleep(SECOND_MILLISECONDS);
        runLatestSolution(false);
      } else {
        console.error(missingInputMessage);
      }
    }
  } else {
    console.log('No solutions found');
  }
};

runLatestSolution();
