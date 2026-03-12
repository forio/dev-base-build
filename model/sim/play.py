import json
import os
from typing import Any

from epicenter import Epicenter
from sim.state import State


LEADERBOARD_COLLECTION = "binary-search"
LEADERBOARD_SCOPE_PRESET = "leaderboardScope"


class Play:

    @staticmethod
    def guess(state: State, target: int, guess: Any) -> State:
        if state.won:
            state.advice = "Already solved."
            return state

        try:
            parsed_guess = int(guess)
        except (TypeError, ValueError) as exc:
            raise ValueError("Guess must be an integer.") from exc

        if parsed_guess < 1 or parsed_guess > 1_000:
            raise ValueError("Guess must be between 1 and 1000.")

        state.guesses.append(parsed_guess)
        state.attempts = len(state.guesses)

        return Play.maybe_resolve(state, target, parsed_guess)

    @staticmethod
    def maybe_resolve(state: State, target: int, guess: int) -> State:
        if guess < target:
            state.minimum = max(state.minimum, guess + 1)
            state.advice = "Higher"
            return state

        if guess > target:
            state.maximum = min(state.maximum, guess - 1)
            state.advice = "Lower"
            return state

        state.won = True
        state.advice = "Correct"
        Play.record_win(state)
        return state

    @staticmethod
    def record_win(state: State) -> None:
        worker_context = json.loads(os.environ["EPICENTER_WORKER_CONTEXT"])
        scope = worker_context.get("execution", {}).get("presets", {}).get(LEADERBOARD_SCOPE_PRESET)
        run_key = worker_context.get("runKey")

        if not scope:
            Epicenter.log("WARN", "Skipping leaderboard callback because leaderboard scope preset is missing.")
            return
        if not run_key:
            Epicenter.log("WARN", "Skipping leaderboard callback because runKey is missing.")
            return

        Epicenter.callback(
            "leaderboard",
            [{
                "collection": LEADERBOARD_COLLECTION,
                "scope": scope,
                "allowChannel": True,
                "tags": [{
                    "label": "runKey",
                    "content": run_key,
                }],
                "scores": [{
                    "name": "attempts",
                    "quantity": state.attempts,
                }],
            }],
        )
