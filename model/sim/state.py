from typing import Any


# This class holds the state of the model.
# It's convenient to put everything in here that needs to be saved
# So just one parent variable (state) can be saved to the database
class State:
    minimum: int
    maximum: int
    guesses: list[int]
    advice: str
    won: bool
    attempts: int

    def __init__(self) -> None:
        self.minimum = 1
        self.maximum = 1_000
        self.guesses = []
        self.advice = "Make a guess."
        self.won = False
        self.attempts = 0

    def __getitem__(self, key: str) -> Any:
        return getattr(self, key)

    def __setitem__(self, key: str, value: Any) -> None:
        setattr(self, key, value)
