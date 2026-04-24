from __future__ import annotations

import time

from app.core.config import get_settings
from app.services.container import get_container
from app.worker.processor import JobProcessor


def run_forever() -> None:
    settings = get_settings()
    services = get_container()
    processor = JobProcessor(services)

    while True:
        messages = services.queue.receive(max_messages=5)
        if not messages:
            time.sleep(settings.poll_interval_seconds)
            continue

        for message in messages:
            succeeded = processor.process(message.envelope)
            if succeeded:
                services.queue.acknowledge(message)


if __name__ == "__main__":
    run_forever()
