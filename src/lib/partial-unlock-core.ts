export type AccessSource = "LICENSE" | "TRIAL" | "LOCKED";

export interface CoarseAccessState {
  accessSource: AccessSource;
  isPremium: boolean;
  isLocked: boolean;
  isTrialActive: boolean;
}

export interface PartialUnlockConfig {
  freeBaseDurations: number[];
  premiumAccessSources?: AccessSource[];
  upgradeVisibleAccessSources?: AccessSource[];
}

export interface EntitlementState extends CoarseAccessState {
  allowedBaseDurations: number[];
  canUseCustomDuration: boolean;
  canUseMusic: boolean;
  canUseBackgroundFeatures: boolean;
}

export type FeatureKey = "customDuration" | "music" | "backgroundFeatures";

export const DEFAULT_PARTIAL_UNLOCK_CONFIG: PartialUnlockConfig = {
  freeBaseDurations: [5, 15, 25],
  premiumAccessSources: ["LICENSE", "TRIAL"],
  upgradeVisibleAccessSources: ["TRIAL", "LOCKED"],
};

export function resolveEntitlementsFromAccess(
  access: CoarseAccessState,
  config: PartialUnlockConfig = DEFAULT_PARTIAL_UNLOCK_CONFIG,
): EntitlementState {
  const premiumAccessSources = config.premiumAccessSources ?? ["LICENSE", "TRIAL"];
  const isPremium = premiumAccessSources.includes(access.accessSource);

  return {
    ...access,
    isPremium,
    isLocked: false,
    allowedBaseDurations: [...config.freeBaseDurations],
    canUseCustomDuration: isPremium,
    canUseMusic: isPremium,
    canUseBackgroundFeatures: isPremium,
  };
}

export function applyForcedFreeMode(
  entitlements: EntitlementState,
  config: PartialUnlockConfig = DEFAULT_PARTIAL_UNLOCK_CONFIG,
): EntitlementState {
  return {
    ...entitlements,
    accessSource: "LOCKED",
    isPremium: false,
    isLocked: false,
    isTrialActive: false,
    allowedBaseDurations: [...config.freeBaseDurations],
    canUseCustomDuration: false,
    canUseMusic: false,
    canUseBackgroundFeatures: false,
  };
}

export function isDurationAllowed(
  minutes: number,
  entitlements: Pick<EntitlementState, "isPremium" | "allowedBaseDurations">,
): boolean {
  return entitlements.isPremium || entitlements.allowedBaseDurations.includes(minutes);
}

export function isFeatureEnabled(
  feature: FeatureKey,
  entitlements: Pick<
    EntitlementState,
    "canUseCustomDuration" | "canUseMusic" | "canUseBackgroundFeatures"
  >,
): boolean {
  switch (feature) {
    case "customDuration":
      return entitlements.canUseCustomDuration;
    case "music":
      return entitlements.canUseMusic;
    case "backgroundFeatures":
      return entitlements.canUseBackgroundFeatures;
  }
}

export function shouldShowUpgradeEntry(
  access: Pick<CoarseAccessState, "accessSource">,
  config: PartialUnlockConfig = DEFAULT_PARTIAL_UNLOCK_CONFIG,
): boolean {
  const visibleAccessSources = config.upgradeVisibleAccessSources ?? ["TRIAL", "LOCKED"];
  return visibleAccessSources.includes(access.accessSource);
}
