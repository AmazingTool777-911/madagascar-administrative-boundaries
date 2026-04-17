/**
 * Represents a value that can be either synchronous or asynchronous.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Represents a GeoJSON Geometry.
 */
export type GeoJSONGeometry<T extends Record<string, unknown>> = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry:
      | {
        type: "Polygon";
        coordinates: number[][][];
      }
      | {
        type: "MultiPolygon";
        coordinates: number[][][][];
      };
    properties: T;
  }[];
};

/**
 * Represents an individual GeoJSON feature.
 */
export type GeoJSONFeature<T extends Record<string, unknown>> =
  GeoJSONGeometry<T>["features"][number];
