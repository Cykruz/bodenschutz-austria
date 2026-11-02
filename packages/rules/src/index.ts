export type {
  ProjectType,
  MeasureMode,
  Unloading,
  ProductSpec,
  FreightZoneSpec,
  CalculationInput,
  CalculationResult,
  ClassificationInput,
  ClassificationThresholds,
  ClassificationResult,
} from './types.js';
export { calculate, findFreightZone, DEFAULT_WASTE_FACTOR, DEFAULT_LANE_COUNT } from './calculate.js';
export { classify, findSignalWords, DEFAULT_THRESHOLDS, SPECIAL_REQUEST_SIGNALS } from './classify.js';
