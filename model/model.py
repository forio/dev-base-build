import jsonpickle

from epicenter import Epicenter

from sim.state import State
from sim.play import Play

state = None
creator = ''


def initialize():
    global state
    state = State()
    Epicenter.record("state", state)
    return state


def contribute(contribution):
    global state
    actor = Epicenter.actor()
    category = actor['world_role']
    Play.contribute(state, category, contribution)
    Epicenter.record("state", state)
    return state


# Custom encoder and decoder for State using jsonpickle
def state_encoder(variable):
    return jsonpickle.encode(variable, unpicklable=True)


def state_decoder(name, variable, value, mode):
    global state
    state = jsonpickle.decode(value)


Epicenter.register_custom_encoder(State, state_encoder)
Epicenter.register_custom_decoder(State, state_decoder)

initialize()
