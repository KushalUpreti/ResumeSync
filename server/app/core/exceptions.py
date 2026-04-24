class ResumeSyncError(Exception):
    """Base application error."""


class NotFoundError(ResumeSyncError):
    """Raised when a requested resource does not exist."""


class InvalidStateError(ResumeSyncError):
    """Raised when a command cannot be processed in the current state."""
