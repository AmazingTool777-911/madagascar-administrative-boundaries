# NDJSON Administrative Data

This directory contains administrative boundary features of Madagascar in
**Newline Delimited JSON (NDJSON)** format.

## Content Overview

The files in this directory are primarily derived from the original GeoJSON data
found in [data/geojson](../geojson). They have been converted to NDJSON to
ensure that reading and processing the features is memory-friendly, simpler, and
more efficient for streaming operations.

### Key Features and Enhancements

- **Memory Efficiency**: NDJSON allows for line-by-line parsing, significantly
  reducing the memory footprint compared to loading large GeoJSON
  FeatureCollections.
- **Derived Data**: Includes additional features that were not present in the
  original source files:
  - **Provinces**: Complete province-level boundary features.
  - **Current Administrative Boundaries**: Updated region-level data reflecting
    Madagascar's current administrative structure as of today, including the
    distinct regions of **Vatovavy**, **Fitovinany**, and **Ambatosoa**.
