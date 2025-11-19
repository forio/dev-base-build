class Play:

    def contribute(state, category, item):
        if item in state[category]:
            raise ValueError(f"{category[:-1].capitalize()} '{item}' already exists.")
        state[category].append(item)
        return state
