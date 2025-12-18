# app/core/logging_config.py
import logging
import logging.config
import json
import os
from typing import Any, Dict

# -------------------------
# JSON FORMATTER
# -------------------------
class JSONFormatter(logging.Formatter):
    """Formateador de logs en JSON"""

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Extras correctos
        reserved = set(vars(logging.LogRecord("", 0, "", 0, "", (), None)))
        for key, value in record.__dict__.items():
            if key not in reserved:
                log_data[key] = value

        return json.dumps(log_data, ensure_ascii=False)


# -------------------------
# SETUP
# -------------------------
def setup_logging(level: str = "INFO", format_type: str = "json"):
    level = level.upper()
    os.makedirs("logs", exist_ok=True)

    if format_type == "json":
        config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json": {
                    "()": JSONFormatter,
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": level,
                    "formatter": "json",
                    "stream": "ext://sys.stdout"
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": level,
                    "formatter": "json",
                    "filename": "logs/app.log",
                    "maxBytes": 10485760,
                    "backupCount": 10
                }
            },
            "root": {
                "level": level,
                "handlers": ["console", "file"]
            },
            "loggers": {
                "uvicorn": {
                    "level": "INFO",
                    "handlers": ["console", "file"],
                    "propagate": False
                },
                "sqlalchemy.engine": {
                    "level": "WARNING",
                    "handlers": ["console"],
                    "propagate": False
                }
            }
        }
    else:
        config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": level,
                    "formatter": "standard"
                }
            },
            "root": {
                "level": level,
                "handlers": ["console"]
            }
        }

    logging.config.dictConfig(config)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
