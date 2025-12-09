import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Alembic config
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- RUTA CORRECTA PARA WINDOWS + PROYECTOS COMO EL TUYO ---

# Ruta absoluta de la carpeta backend/
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Añadimos backend/ al PATH
sys.path.insert(0, BASE_DIR)

# IMPORTS DESPUÉS DE AÑADIR PATH
from app.db.base import Base
import app.db.models

target_metadata = Base.metadata

# --- OFFLINE ---
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# --- ONLINE ---
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
