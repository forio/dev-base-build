# This class holds the state of the model.
# It's convenient to put everything in here that needs to be saved
# So just one parent variable (state) can be saved to the database
class State:
    def __init__(self):
        self.animals = []
        self.colors = []
        self.places = []

    def __getitem__(self, key):
        return getattr(self, key)

    def __setitem__(self, key, value):
        setattr(self, key, value)
