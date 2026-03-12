import { expect, Page } from '@playwright/test';

export type Credentials = {
  username: string;
  password: string;
};

export type LeaderboardEntry = {
  rank: string;
  name: string;
  score: number;
  text: string;
};

export type GameLogRow = {
  attempt: number;
  guess: number;
  result: string;
};

export type GameState = {
  minimum: number;
  maximum: number;
  attempts: number;
  won: boolean;
  rankText: string | null;
  leaderboard: LeaderboardEntry[];
  logRows: GameLogRow[];
};

export const credentials = {
  playerOne: {
    username: process.env.PLAYWRIGHT_USERNAME_1 ?? 'mpq-s-1',
    password: process.env.PLAYWRIGHT_PASSWORD ?? 'admin123',
  },
  playerTwo: {
    username: process.env.PLAYWRIGHT_USERNAME_2 ?? 'mpq-s-2',
    password: process.env.PLAYWRIGHT_PASSWORD ?? 'admin123',
  },
  playerThree: {
    username: process.env.PLAYWRIGHT_USERNAME_3 ?? 'mpq-s-3',
    password: process.env.PLAYWRIGHT_PASSWORD ?? 'admin123',
  },
} satisfies Record<string, Credentials>;

const appURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8888';

const gameHeading = (page: Page) =>
  page.getByRole('heading', { name: 'Number challenge' });

const loginHeading = (page: Page) => page.getByRole('heading', { name: 'Log In' });

export const leaderboardSnapshot = (entries: LeaderboardEntry[]) =>
  JSON.stringify(entries.map((entry) => [entry.rank, entry.name, entry.score, entry.text]));

export async function login(page: Page, creds: Credentials) {
  await page.goto(`${appURL}/#/`);
  await loginHeading(page).waitFor({ timeout: 15_000 });
  await page.getByRole('textbox', { name: 'Username' }).fill(creds.username);
  await page.getByRole('textbox', { name: 'Password' }).fill(creds.password);
  await page.getByRole('button', { name: 'Log In' }).click();

  const rows = page.locator('tbody tr');
  if ((await rows.count()) > 0) {
    await rows.first().click();
    await page.getByRole('button', { name: 'Log In' }).click();
  }

  await expect(gameHeading(page)).toBeVisible({ timeout: 15_000 });
}

export async function readGameState(page: Page): Promise<GameState> {
  await expect(gameHeading(page)).toBeVisible({ timeout: 15_000 });

  const headerTags = await gameHeading(page)
    .locator('xpath=..')
    .locator('span')
    .allTextContents();

  const rangeText = headerTags[0] ?? '';
  const attemptsText = headerTags[1] ?? '';
  const rangeMatch = rangeText.match(/(\d+)–(\d+)/);
  const attemptsMatch = attemptsText.match(/(\d+) guess(?:es)?/);

  if (!rangeMatch || !attemptsMatch) {
    throw new Error(`Unable to parse game header: "${rangeText}" "${attemptsText}"`);
  }

  const mainText = (await page.locator('main').textContent()) ?? '';
  const logRows = await page.locator('table tbody tr').evaluateAll((rows) =>
    rows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((cell) =>
        (cell.textContent ?? '').trim()
      );

      return {
        attempt: Number(cells[0] ?? '0'),
        guess: Number(cells[1] ?? '0'),
        result: cells[2] ?? '',
      };
    })
  );
  const leaderboard = await page.locator('aside ol li').evaluateAll((rows) =>
    rows.map((row) => {
      const spans = Array.from(row.querySelectorAll('span')).map((cell) =>
        (cell.textContent ?? '').trim()
      );

      return {
        rank: spans[0] ?? '',
        name: spans[1] ?? '',
        score: Number((row.querySelector('strong')?.textContent ?? '').trim()),
        text: (row.textContent ?? '').trim(),
      };
    })
  );

  return {
    minimum: Number(rangeMatch[1]),
    maximum: Number(rangeMatch[2]),
    attempts: Number(attemptsMatch[1]),
    won: /Solved in \d+!/.test(mainText),
    rankText: (mainText.match(/Rank #\d+|Syncing to leaderboard/) ?? [null])[0],
    leaderboard,
    logRows,
  };
}

export async function submitGuess(page: Page, guess: number) {
  const previous = await readGameState(page);
  await page.locator('input[name="guess"]').fill(String(guess));
  await page.getByRole('button', { name: 'Guess' }).click();

  await expect
    .poll(async () => (await readGameState(page)).attempts, {
      timeout: 15_000,
      message: `Guess ${guess} should increment the attempt count`,
    })
    .toBe(previous.attempts + 1);

  return readGameState(page);
}

export async function solveCurrentGame(page: Page) {
  let state = await readGameState(page);
  const guesses: number[] = [];
  const seen = new Set<string>();

  while (!state.won) {
    const guess = Math.round((state.minimum + state.maximum) / 2);
    const key = `${state.minimum}:${state.maximum}:${guess}`;
    if (seen.has(key)) throw new Error(`Detected a guess loop at ${key}`);

    seen.add(key);
    guesses.push(guess);
    state = await submitGuess(page, guess);

    if (guesses.length > 20) {
      throw new Error('Game did not resolve within 20 guesses');
    }
  }

  await expect
    .poll(async () => (await readGameState(page)).rankText, {
      timeout: 10_000,
      message: 'Winning a run should eventually resolve rank text',
    })
    .toMatch(/^Rank #\d+$/);

  return {
    guesses,
    state: await readGameState(page),
  };
}

export async function startNewGame(page: Page) {
  await page.getByRole('button', { name: 'Play Again' }).click();

  await expect
    .poll(async () => (await readGameState(page)).won, {
      timeout: 15_000,
      message: 'Play Again should return the player to an active game',
    })
    .toBe(false);

  return readGameState(page);
}

export async function ensureFreshGame(page: Page) {
  let state = await readGameState(page);

  if (!state.won && state.attempts === 0) return state;

  if (!state.won) {
    await solveCurrentGame(page);
    state = await readGameState(page);
  }

  if (state.won) {
    state = await startNewGame(page);
  }

  if (state.won || state.attempts !== 0) {
    throw new Error('Unable to normalize the player into a fresh game');
  }

  return state;
}

export async function waitForLeaderboardChange(
  page: Page,
  baseline: string,
  timeout = 15_000
) {
  await expect
    .poll(async () => leaderboardSnapshot((await readGameState(page)).leaderboard), {
      timeout,
      message: 'Leaderboard should change after another player finishes a run',
    })
    .not.toBe(baseline);

  return readGameState(page);
}
