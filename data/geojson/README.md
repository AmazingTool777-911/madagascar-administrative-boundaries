# GeoJSON Source Data

This directory serves as a reference for the official spatial data sources used in this project. 

Due to their large size, the raw GeoJSON files are not included in this repository. Please note that these files are **not required** to run the current administrative data extraction pipeline, as that process consumes the pre-processed records found in `/data/ndjson/`.

## Official Data Source

The administrative boundary features were originally extracted and processed from the following dataset:

**Dataset Link**: [geoBoundaries Admin Boundaries for Madagascar (HDX)](https://data.humdata.org/dataset/geoboundaries-admin-boundaries-for-madagascar)

### Source File Mapping

The table below lists the specific files available on the official website and their corresponding administrative levels in this project. This mapping is provided to help users identify the origin of the data:

| Official Filename | Administrative Level | Data Content |
| :--- | :--- | :--- |
| `geoBoundaries-MDG-ADM1.geojson` | ADM1 | Regions |
| `geoBoundaries-MDG-ADM2.geojson` | ADM2 | Districts |
| `geoBoundaries-MDG-ADM3.geojson` | ADM3 | Communes |
| `geoBoundaries-MDG-ADM4.geojson` | ADM4 | Fokontanys |

---

*Note: This directory is kept as a placeholder to maintain the provenance of the data. The actual pipeline execution relies on the optimized NDJSON files located in the root `/data/ndjson/` folder.*
