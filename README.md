# Madagascar Administrative Boundaries (mada-adm)

A Deno-based utility project designed to enable existing databases to directly
incorporate and manage Madagascar's administrative boundaries data.

## Overview

The primary goal of this project is to provide a robust pipeline for handling
Madagascar's administrative hierarchy—from Provinces down to Fokontanys. It
bridges the gap between raw spatial data sources and structured relational
databases, providing tools for extraction, cleaning, and eventually, automated
seeding.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Project Structure & Content](#project-structure--content)
- [CLI Commands & Usage](#cli-commands--usage)
  - [Global Options & Environment Variables](#global-options--environment-variables)
  - [Commands](#commands)
- [Current Status](#current-status)
- [Tech Stack](#tech-stack)

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

1. **Git LFS**: This project uses Git Large File Storage (LFS) to manage the `.ndjson` data files. You **must** install Git LFS before cloning the repository to ensure the data files are properly downloaded.
   - [Install Git LFS](https://github.com/git-lfs/git-lfs?utm_source=gitlfs_site&utm_medium=installation_link&utm_campaign=gitlfs#installing)
2. **Deno**: The project is built with Deno. You need to have it installed on your machine.
   - [Install Deno](https://docs.deno.com/runtime/getting_started/installation/)

### Installation

1. **Clone the repository** (make sure Git LFS is installed first):
   ```bash
   git clone <repository-url>
   cd mada-adm
   ```

2. **Install dependencies**:
   Run the following command to install the project dependencies:
   ```bash
   deno install
   ```

### Testing

To ensure everything is set up correctly, you can run the test suite:

```bash
deno task test
```

### Building

To build the CLI executables for different platforms:

```bash
deno task build
```
This command compiles the project into standalone CLI executables and places them in their respective platform-specific target directories (e.g., `bin/x86_64-pc-windows-msvc/`, `bin/aarch64-apple-darwin/`, `bin/x86_64-unknown-linux-gnu/`, etc.).

### Running CLI Tasks

You can run the main CLI task using:

```bash
deno task cli
```
*(See the [CLI Commands & Usage](#cli-commands--usage) section below for more details.)*

## Project Structure & Content

This repository serves as a centralized hub for administrative data and the
logic required to process it:

- **CLI Source Code**: The Deno source code for the command-line interface (found in `/commands/`).
- **CLI Executables**: The compiled standalone executables for different platforms (found in `/bin/`).
- **Data Sources**: Raw administrative boundary datasets (found in `/data/geojson/`).
- **Pre-processed Data**: Optimized datasets (found in `/data/ndjson/`) that have
  been cleaned and structured for efficient processing.
- **Extraction Scripts**: Utility scripts used to generate and extract seeding
  inputs from raw sources (found in `/scripts/`).
- **Data Catalogs**: Structured references for administrative metadata
  (currently in development).

## CLI Commands & Usage

The project itself functions as a command-line interface to orchestrate the pipeline. Below
is an overview of the available commands, along with their global and scoped
configurations.

### Global Options & Environment Variables

These options can be provided either as CLI flags or environment variables. If
both are provided, the CLI flags take precedence. They apply globally across all
commands. All options are optional.

| CLI Flag            | Environment Variable | Description                                                                                   |
| :------------------ | :------------------- | :-------------------------------------------------------------------------------------------- |
| `--db-type`         | `DB_TYPE`            | The database type to connect to (`sqlite`, `mysql`, `postgres`, `mongodb`). (default: sqlite) |
| `--cli-debug`       | `CLI_DEBUG`          | Enable debug logging across the pipeline.                                                     |
| `--pg.schema`       | `PG_SCHEMA`          | The PostgreSQL schema to use. (default: public)                                               |
| `--pg.url`          | `PG_URL`             | The URL to connect to the PostgreSQL database.                                                |
| `--pg.host`         | `PG_HOST`            | Hostname or IP address of the PostgreSQL server. (default: localhost)                         |
| `--pg.port`         | `PG_PORT`            | Port number of the PostgreSQL server. (default: 5432)                                         |
| `--pg.user`         | `PG_USER`            | Username for authenticating with the PostgreSQL server. (default: postgres)                   |
| `--pg.password`     | `PG_PASSWORD`        | Password for authenticating with the PostgreSQL server.                                       |
| `--pg.database`     | `PG_DATABASE`        | Name of the database to be used. (default: postgres)                                          |
| `--pg.ssl`          | `PG_SSL`             | Whether to use SSL for the connection.                                                        |
| `--pg.ca-cert-file` | `PG_CA_CERT_FILE`    | Filename of the CA cert under `db/.ca-certificates/`.                                         |
| `--pg.ca-cert-path` | `PG_CA_CERT_PATH`    | Full path to the CA cert file.                                                                |

### Commands

#### `mada-adm` (Index / Main Command)

**CLI Execution:** `mada-adm`  
**Local Execution:** `deno task cli`

The core CLI command for seeding administrative data into the database. It
features a resumable, fault-tolerant architecture with real-time terminal
progress visualization.

> **Note:** Resumable jobs are only supported when Redis is enabled. If the job
> is executed entirely in-memory (e.g., when Redis is disabled), the job will
> restart from scratch every time it is interrupted.
>
> **Warning:** When resuming a previously interrupted job, you must ensure that
> the input data has not been modified since the job was last interrupted.
> Resuming with modified input data will result in an inconsistent database
> state.

**Command-Scoped Options / Env Variables** These options control the job
orchestration (Redis or In-Memory queues) specifically for the seeding pipeline.
All options are optional.

**Redis Options**

| CLI Flag                                  | Environment Variable                    | Description                                                      |
| :---------------------------------------- | :-------------------------------------- | :--------------------------------------------------------------- |
| `--disable-redis`                         | `DISABLE_REDIS`                         | Disable Redis connection. Uses the in-memory queue instead.      |
| `--redis.url`                             | `REDIS_URL`                             | Full Redis connection URL.                                       |
| `--redis.host`                            | `REDIS_HOST`                            | Hostname or IP address of the Redis server. (default: localhost) |
| `--redis.port`                            | `REDIS_PORT`                            | TCP port the Redis server listens on. (default: 6379)            |
| `--redis.user`                            | `REDIS_USERNAME`                        | Username for Redis authentication.                               |
| `--redis.password`                        | `REDIS_PASSWORD`                        | Password for Redis authentication.                               |
| `--redis.db`                              | `REDIS_DB`                              | Database index.                                                  |
| `--redis.ssl`                             | `REDIS_SSL`                             | Enable TLS/SSL for the connection.                               |
| `--redis.cert-file`                       | `REDIS_CERT_FILE`                       | Filename of the client cert under `redis/.ca-certificates/`.     |
| `--redis.cert-path`                       | `REDIS_CERT_PATH`                       | Full path to the client certificate file.                        |
| `--redis.key-file`                        | `REDIS_KEY_FILE`                        | Filename of the client key under `redis/.ca-certificates/`.      |
| `--redis.key-path`                        | `REDIS_KEY_PATH`                        | Full path to the client key file.                                |
| `--redis.ca-cert-file`                    | `REDIS_CA_CERT_FILE`                    | Filename of the CA cert under `redis/.ca-certificates/`.         |
| `--redis.ca-cert-path`                    | `REDIS_CA_CERT_PATH`                    | Full path to the CA cert file for Redis.                         |

**Queue & Worker Options**

| CLI Flag                                  | Environment Variable                    | Description                                                      |
| :---------------------------------------- | :-------------------------------------- | :--------------------------------------------------------------- |
| `--queue-batch-size`                      | `QUEUE_BATCH_SIZE`                      | Batch size for processing messages concurrently.                 |
| `--queue-max-retries`                     | `QUEUE_MAX_RETRIES`                     | Maximum number of retries per batch in case of an error.         |
| `--in-memory-processing-hwm`              | `IN_MEMORY_PROCESSING_HWM`              | High water mark for in-memory processing workers.                |
| `--in-memory-insert-hwm`                  | `IN_MEMORY_INSERT_HWM`                  | High water mark for the in-memory insert worker.                 |
| `--worker-healthcheck-interval`           | `WORKER_HEALTHCHECK_INTERVAL`           | Interval for worker healthcheck in milliseconds.                 |
| `--worker-pending-min-duration-threshold` | `WORKER_PENDING_MIN_DURATION_THRESHOLD` | Threshold for claiming pending messages in milliseconds.         |
| `--xread-block-duration`                  | `XREAD_BLOCK_DURATION`                  | Duration in milliseconds for XREAD BLOCK calls in Redis.         |
| `--processing-workers-count`              | `PROCESSING_WORKERS_COUNT`              | Number of concurrent processing workers to spawn.                |

### Sub-Commands

#### `set-config`

**CLI Execution:** `mada-adm set-config`  
**Local Execution:** `deno task cli:set-config`

Interactively sets or updates the Mada ADM configuration stored in the database.

**💡 Why use `set-config`?** This command is extremely useful for keeping
different environments isolated. By changing the configuration (e.g. setting
unique table prefixes), you can prevent different sets of tables or
configurations from overriding each other. This allows you to work safely in the
same database while running automated tests, performing experimentations, or
maintaining separate project schemas without destructive interference.

#### `clear`

**CLI Execution:** `mada-adm clear`  
**Local Execution:** `deno task cli:clear`

Drops all ADM tables and the configuration table from the database, effectively
resetting the project state.

#### `update-field`

**CLI Execution:** `mada-adm update-field`  
**Local Execution:** `deno task cli:update-field`

Updates a specific field (like names or spatial GeoJSON boundaries) of an
existing ADM record in the database.

**Arguments:**

- `<adm-level>`: The ADM level of the record (e.g. `province`, `region`,
  `district`, `commune`, `fokontany`).
- `<field>`: The field to update (`value` or `geojson`).

**Value Options:**

- `--value <value>`: The literal value to set for the field.
- **When updating the `geojson` geometry feature**, it is mandatory to provide
  the value in a file because the content is usually too large for the terminal
  to handle directly. How you provide this file depends on how you run the tool:
  - **Running via Deno (`deno task cli:update-field`)**: By default, it looks for a file at `commands/.args/value.txt`. You can specify alternatives using:
    - `--value-file <filename>`: Filename under `commands/.args` to read the value from.
    - `--value-path <path>`: Full absolute or relative path to the file to read the value from.
  - **Running the compiled CLI executable**: The `commands/.args/` directory is bundled inside the executable, so `--value-file` cannot be used with local files. You **must** use `--value-path <path>` to provide the full path to an external file.

**Identification Options:**

Depending on the `<adm-level>` argument provided, you must provide the following identifier options to correctly locate the administrative boundary:

| `<adm-level>` | Required Identifier Options | Example |
| :--- | :--- | :--- |
| `province` | `--province` | `--province "Antananarivo"` |
| `region` | `--region` | `--region "Analamanga"` |
| `district` | `--district.value`, `--district.region` | `--district.value "Ambohidratrimo" --district.region "Analamanga"` |
| `commune` | `--commune.value`, `--commune.district`, `--commune.region` | `--commune.value "Ivato" --commune.district "Ambohidratrimo" --commune.region "Analamanga"` |
| `fokontany` | `--fokontany.value`, `--fokontany.commune`, `--fokontany.district`, `--fokontany.region` | `--fokontany.value "Ivato Centre" --fokontany.commune "Ivato" --fokontany.district "Ambohidratrimo" --fokontany.region "Analamanga"` |

## Current Status

The project is currently in active development. The following extraction
features are available alongside the CLI:

- **Extraction Pipeline**: The
  [extract-adm-inputs.script.ts](file:///home/tolotra/it/projects/mada-adm/scripts/extract-adm-inputs/extract-adm-inputs.script.ts)
  is fully functional, capable of generating seeding inputs from GeoJSON sources
  while handling deduplication and schema-aware processing.
- **Data Inputs**: Pre-extracted and optimized data ready for seeding is
  available in the
  [data/inputs/](file:///home/tolotra/it/projects/mada-adm/data/inputs/)
  directory.

### Coming Soon

- **Database Adapters**: Native support for SQLite, MySQL, and MongoDB within
  the seeding pipeline (currently only PostgreSQL is fully integrated).
- **Data Catalog**: A comprehensive, public-facing catalog of administrative
  metadata.

## Tech Stack

- **Runtime**: [Deno](https://deno.land/)
- **Database**: PostgreSQL (PostGIS) — _SQLite, MySQL, MongoDB support coming
  soon_
- **Job Orchestration**: Redis / In-Memory (for fault-tolerant processing)
- **UI**: CLI with interactive progress tracking and resumable job state

---

_Note: This project is a utility tool intended for developers and data engineers
looking to integrate Madagascar's administrative data into their own
applications._
