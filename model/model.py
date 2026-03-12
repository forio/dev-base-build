import hashlib
import json
import jsonpickle
import os
from typing import Any

from epicenter import Epicenter

from sim.state import State
from sim.play import Play

state: State | None = None
# Root-module placeholder so the worker can inject the execution preset.
leaderboardScope: dict[str, Any] = {}


def resolve_target() -> int:
    worker_context = json.loads(os.environ["EPICENTER_WORKER_CONTEXT"])
    run_key = worker_context["runKey"]
    hash_prefix = hashlib.sha256(run_key.encode("utf-8")).hexdigest()[:8]
    return (int(hash_prefix, 16) % 1_000) + 1


def initialize() -> State:
    global state
    state = State()
    Epicenter.record("state", state)
    return state


def guess(guess: Any) -> State:
    global state
    assert state is not None, "Call initialize() before guess()"
    target = resolve_target()
    Play.guess(state, target, guess)
    Epicenter.record("state", state)
    return state


# Custom encoder and decoder for State using jsonpickle
def state_encoder(variable: State) -> str:
    return jsonpickle.encode(variable, unpicklable=True)


def state_decoder(name: str, variable: Any, value: str, mode: Any) -> None:
    global state
    state = jsonpickle.decode(value)


Epicenter.register_custom_encoder(State, state_encoder)
Epicenter.register_custom_decoder(State, state_decoder)

initialize()
