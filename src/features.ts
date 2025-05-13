import type { Stage } from "./config.ts";
import { STAGE } from "./config.ts";
import { logger } from "./helpers/index.ts";

const FEATURE_FLAGS = {
  Example: "Example",
  Sentry: "Sentry"
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
export type FeatureFlagValue = (typeof FEATURE_FLAGS)[FeatureFlag];

const getFeatureFlag = (feature: FeatureFlag, stage: Stage): boolean => {
  const envVar = `FEATURE_FLAG_${feature.toUpperCase()}_${stage.toUpperCase()}`;
  return process.env[envVar] === "true";
};

export const hasFeatureFlag = (feature: FeatureFlag, stage: Stage): boolean => {
  return getFeatureFlag(feature, stage);
};

export const isSentryEnabled = hasFeatureFlag(FEATURE_FLAGS.Sentry, STAGE);
logger.info(`FEATURE FLAG - ${FEATURE_FLAGS.Sentry} is enabled: ${isSentryEnabled}`);
