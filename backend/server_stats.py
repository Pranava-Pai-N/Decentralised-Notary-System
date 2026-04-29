import time


class ServerStats:
    def __init__(self) -> None:
        self.start_time = time.time()
        self.files_processed_count = 0

    def increment_files_processed(self) -> None:
        self.files_processed_count += 1

    def health_payload(self) -> dict[str, float | int | str]:
        uptime_seconds = round(time.time() - self.start_time, 2)
        return {
            "status": "healthy",
            "uptime_seconds": uptime_seconds,
            "files_processed_session": self.files_processed_count,
        }


server_stats = ServerStats()
