import { expect, test } from '@playwright/test';
import {
  credentials,
  ensureFreshGame,
  leaderboardSnapshot,
  login,
  readGameState,
  solveCurrentGame,
  startNewGame,
  submitGuess,
  waitForLeaderboardChange,
} from './helpers';

test.describe.serial('number challenge integration', () => {
  test('supports guessing, winning, and replaying', async ({ page }) => {
    await login(page, credentials.playerOne);
    const initial = await ensureFreshGame(page);

    expect(initial.minimum).toBe(1);
    expect(initial.maximum).toBe(1000);
    expect(initial.attempts).toBe(0);

    const firstGuessValue = Math.round((initial.minimum + initial.maximum) / 2);
    const first = await submitGuess(page, firstGuessValue);

    expect(first.attempts).toBe(1);
    expect(first.logRows).toHaveLength(1);
    expect(first.logRows[0]?.guess).toBe(firstGuessValue);
    expect(first.minimum !== initial.minimum || first.maximum !== initial.maximum).toBe(true);

    const secondGuessValue =
      Math.round((first.minimum + first.maximum) / 2) === firstGuessValue
        ? firstGuessValue + 1
        : Math.round((first.minimum + first.maximum) / 2);
    const second = await submitGuess(page, secondGuessValue);

    expect(second.attempts).toBe(2);
    expect(second.logRows[0]?.guess).toBe(secondGuessValue);
    expect(second.logRows[1]?.guess).toBe(firstGuessValue);

    const solved = await solveCurrentGame(page);
    expect(solved.state.won).toBe(true);
    expect(solved.state.rankText).toMatch(/^Rank #\d+$/);
    expect(solved.state.logRows[0]?.result).toContain('Correct');

    const replay = await startNewGame(page);
    expect(replay.won).toBe(false);
    expect(replay.attempts).toBe(0);
    expect(replay.logRows).toHaveLength(0);
  });

  test('pushes leaderboard updates across sessions', async ({ browser }) => {
    const observerContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const observerPage = await observerContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      await login(observerPage, credentials.playerOne);
      const observerState = await readGameState(observerPage);
      const baseline = leaderboardSnapshot(observerState.leaderboard);

      await login(playerPage, credentials.playerThree);

      let observerAfter = observerState;
      let changed = false;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        await ensureFreshGame(playerPage);
        const solved = await solveCurrentGame(playerPage);
        expect(solved.state.won).toBe(true);
        expect(solved.state.rankText).toMatch(/^Rank #\d+$/);

        try {
          observerAfter = await waitForLeaderboardChange(observerPage, baseline, 10_000);
          changed = true;
          break;
        } catch (error) {
          if (attempt === 2) throw error;
        }
      }

      expect(changed).toBe(true);

      const scores = observerAfter.leaderboard.map((entry) => entry.score);
      expect(scores.every((score, index) => index === 0 || scores[index - 1]! <= score)).toBe(
        true
      );
      expect(observerAfter.leaderboard.length).toBeGreaterThan(0);
    } finally {
      await observerContext.close();
      await playerContext.close();
    }
  });
});
