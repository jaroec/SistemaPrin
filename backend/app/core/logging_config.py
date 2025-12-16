import logging
import logging.config
import json
from typing import Any, Dict

def setup_logging(level: str = "INFO", format_type: str = "json"):
    """
    Configura logging centralizado
    
    Args:
        level: DEBUG, INFO, WARNING, ERROR, CRITICAL
        format_type: "json" o "text"
    """
    
    if format_type == "json":
        config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json": {
                    "()": JSONFormatter,
                },
                "standard": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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
                    "maxBytes": 10485760,  # 10MB
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
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": level,
                    "formatter": "standard",
                    "filename": "logs/app.log",
                    "maxBytes": 10485760,
                    "backupCount": 10
                }
            },
            "root": {
                "level": level,
                "handlers": ["console", "file"]
            }
        }
    
    logging.config.dictConfig(config)


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
        
        # Agregar excepciones si existen
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Agregar datos extras si existen
        if hasattr(record, "extra"):
            log_data.update(record.extra)
        
        return json.dumps(log_data, ensure_ascii=False)


def get_logger(name: str) -> logging.Logger:
    """Obtiene un logger configurado"""
    return logging.getLogger(name)