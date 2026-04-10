# mada-adm

A CLI tool for seeding databases with the administrative boundaries data of
Madagascar.

## Overview

`mada-adm` automates the process of populating a database with Madagascar's
administrative boundaries — from the raw public GeoJSON sources down to
individual boundary features at every administrative level (province, region,
district, commune, fokontany).

The raw input data comes from public GeoJSON files provided by
[geoBoundaries via HDX](https://data.humdata.org/dataset/geoboundaries-admin-boundaries-for-madagascar).
Because these files are large and the hierarchy between levels is not strictly
enforced in the source data (child boundaries do not always fall cleanly within
their parent boundaries), a preprocessing step is required before seeding. That
step resolves parent-child relationships by computing the maximum intersection
area between features using PostGIS, producing a clean, structured dataset ready
for insertion.

## Deliverables

### CLI (`mada-adm`)

The primary deliverable. A binary CLI tool — also runnable as a Deno program or
inside Docker — that seeds any supported database with Madagascar's
administrative boundaries data.

**Commands:**

- `seed` — populates a fresh database with the full administrative boundaries
  dataset
- `update` — updates the administrative boundary records on an already-seeded
  database

By default, the CLI enforces the use of Redis to handle the seeding pipeline in
a fault-tolerant manner (see [Redis & Fault Tolerance](#redis--fault-tolerance)
below). Users may opt out of Redis if they choose to.

### Visualization Web App

A lightweight web application that renders Madagascar's administrative
boundaries on an interactive [Leaflet](https://leafletjs.com/) + OpenStreetMap
map. Features include search and filters across administrative levels.

### Preprocessing Script

A standalone script that processes the raw GeoJSON source files and produces the
clean structured dataset consumed by the CLI. This is not part of the main
seeding workflow — the clean data is already bundled — but it is available for
users who want to inspect, reproduce, or customize the data preparation step.

## Redis & Fault Tolerance

The raw GeoJSON source files are large. Loading them entirely into memory is
impractical on most machines, and if the pipeline is interrupted mid-run,
progress would otherwise be lost entirely.

To address this, the CLI and Docker setup use
[Redis Streams](https://redis.io/docs/data-types/streams/) as a job queue.
Features are pushed into the stream incrementally as the GeoJSON is parsed, and
workers acknowledge each feature only after it has been successfully processed.
This means the pipeline can be safely interrupted and resumed at any point
without reprocessing already-completed work.

Redis is enforced by default in both the CLI and Docker setup. Users who prefer
to run without Redis may opt out, accepting the trade-off of no resume
capability.

## Running Options

- **Binary** — download and run the prebuilt binary directly
- **Deno** — run as a Deno program on the host machine
- **Docker** — run using the provided Docker setup, which includes Redis out of
  the box

## Data Source

Administrative boundary data sourced from:

> geoBoundaries / William & Mary geoLab — _Admin Boundaries for Madagascar_
> https://data.humdata.org/dataset/geoboundaries-admin-boundaries-for-madagascar
> License: CC BY 4.0
