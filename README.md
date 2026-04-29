# Madagascar Administrative Boundaries (mada-adm)

A Deno-based utility project designed to enable existing databases to directly
incorporate and manage Madagascar's administrative boundaries data.

## Overview

The primary goal of this project is to provide a robust pipeline for handling
Madagascar's administrative hierarchy—from Provinces down to Fokontanys. It
bridges the gap between raw spatial data sources and structured relational
databases, providing tools for extraction, cleaning, and eventually, automated
seeding.

## Project Structure & Content

This repository serves as a centralized hub for administrative data and the
logic required to process it:

- **Data Sources**: Raw administrative boundary datasets.
- **Pre-processed Data**: Optimized datasets (found in `/data/ndjson`) that have
  been cleaned and structured for efficient processing.
- **Extraction Scripts**: Utility scripts used to generate and extract seeding
  inputs from raw sources.
- **Data Catalogs**: Structured references for administrative metadata
  (currently in development).

## Current Status

The project is currently in active development. The following components are
available:

- **Seeding Pipeline (Main Command)**: The core CLI command for seeding
  administrative data into a database is functional. It features a resumable,
  fault-tolerant architecture with real-time terminal progress visualization.
  - **Supported Adapters**: PostgreSQL (Active).
  - **Pending Integration**: SQLite, MySQL, and MongoDB.
- **Extraction Pipeline**: The
  [extract-adm-inputs.script.ts](file:///home/tolotra/it/projects/mada-adm/scripts/extract-adm-inputs/extract-adm-inputs.script.ts)
  is fully functional, capable of generating seeding inputs from GeoJSON sources
  while handling deduplication and schema-aware processing.
- **Data Inputs**: Pre-extracted and optimized data ready for seeding is
  available in the
  [data/inputs/](file:///home/tolotra/it/projects/mada-adm/data/inputs/)
  directory.

### Coming Soon

- **Administrative Management Commands**: Subcommands for updating specific
  administrative fields, managing project configuration, and clearing the
  database.
- **Database Adapters**: Native support for SQLite, MySQL, and MongoDB.
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
