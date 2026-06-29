from abc import ABC, abstractmethod


class StateStorage(ABC):
    @abstractmethod
    def load_state(self):
        """Return the persisted CRM state, or None when no usable state exists."""

    @abstractmethod
    def save_state(self, state):
        """Persist a complete CRM state object."""

