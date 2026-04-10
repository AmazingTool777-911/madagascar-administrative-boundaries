# Analysis: ADM Inputs Extraction Process

This document analyzes the relationship between the
`adm-inputs-extraction.excalidraw` diagram, the `README.md` documentation, and
the (currently empty) `extract-adm-inputs.script.ts` script.

## 1. Excalidraw Diagram Analysis

The `adm-inputs-extraction.excalidraw` diagram describes a data transformation
pipeline that converts raw geoboundaries data into a structured format suitable
for the `mada-adm` seeding tool.

### Input: Raw GeoJSON Files

The top section of the diagram, titled **"GeoJSON files by adm level"**,
Represents the raw source data from
[geoBoundaries](https://data.humdata.org/dataset/geoboundaries-admin-boundaries-for-madagascar).

- **Structure**: Individual GeoJSON files for each administrative level
  (Provinces, Regions, Districts, Communes, Fokontany).
- **Metadata**: Each feature contains minimal properties, primarily `shapeName`
  and its `coordinates` (polygon points).
- **Missing Link**: critically, the raw files **do not** contain explicit links
  to parent administrative units (e.g., a District feature doesn't know which
  Region it belongs to).

### Output: Structured Seed Files

The bottom section, titled **"Database adm data seeds input files"**, defines
the target format for the preprocessed data.

- **Enrichment**: Each administrative feature is enriched with its parent
  hierarchy:
  - **Provinces**: Just the province name and GeoJSON.
  - **Regions**: Adds the parent `province` name.
  - **Districts**: Adds parent `region` and `province` names.
  - **Communes**: Adds parent `district`, `region`, and `province`.
  - **Fokontany**: Adds parents up to the province level.
- **Final Format**: A set of JSON objects that the CLI seeder can easily parse
  and insert into the database with correct foreign key relationships.

---

## 2. README.md Context

The `README.md` provides the technical justification for this workflow:

- **Data Quality**: Child boundaries in the source data do not always align
  perfectly with parent boundaries (overlapping or slight gaps).
- **Resolution Strategy**: The hierarchy is resolved by **computing the maximum
  intersection area** between a child feature and all possible parent features.
- **Technology**: It explicitly mentions using **PostGIS** for these spatial
  calculations.

---

## 3. Relationship to `extract-adm-inputs.script.ts`

The script `extract-adm-inputs.script.ts` (currently empty) is intended to be
the **Preprocessing Script** described in the `README.md`.

### Intended Responsibilities:

1. **Ingestion**: Load raw GeoJSON files from `data/geojson/`.
2. **Spatial Analysis**:
   - Likely connects to a temporary PostGIS instance or uses a spatial library.
   - Performs the "Maximum Intersection" logic to determine which parent each
     feature belongs to.
3. **Transformation**: Maps the raw feature properties to the enriched schema
   seen in the Excalidraw diagram.
4. **Export**: Writes the resulting structured JSON files into `data/extracted/`
   (as direct outputs from the preprocessing step, to be later finalized into
   `data/inputs/`).

## Conclusion

The Excalidraw diagram acts as the **Data Model specification** for the
preprocessing step. While the `README.md` explains **why** and **how**
(mathematically/spatially) the transformation happens, the
`extract-adm-inputs.script.ts` script is the **implementation** that bridges the
gap between the raw GeoJSON inputs and the clean, hierarchical outputs shown in
the diagram.
