import { z } from "zod";

import { CapacityProfileSchema, EMPTY_CAPACITY_PROFILE } from "./capacity-profile";

/**
 * A named, versioned set of capacity assumptions. Versioning the profile
 * separately from the model lets AXON tell a user *why* a stored run no
 * longer applies: the engine changed, or their own assumptions did.
 */

export const SIMULATION_PROFILE_VERSION = "1.0.0";

export const SimulationProfileSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Bumped by AXON when the profile's meaning changes. */
  version: z.string().min(1),
  /**
   * Monotonic counter bumped on every user edit, so a stored run can be
   * matched against the exact assumptions that produced it.
   */
  revision: z.number().int().nonnegative(),
  capacityProfile: CapacityProfileSchema,
});

export type SimulationProfile = z.infer<typeof SimulationProfileSchema>;

export const DEFAULT_SIMULATION_PROFILE: SimulationProfile = {
  id: "default",
  label: "Default assumptions",
  version: SIMULATION_PROFILE_VERSION,
  revision: 0,
  capacityProfile: EMPTY_CAPACITY_PROFILE,
};

/** Returns a new profile with the revision advanced. */
export function withCapacityProfile(
  profile: SimulationProfile,
  capacityProfile: SimulationProfile["capacityProfile"],
): SimulationProfile {
  return { ...profile, capacityProfile, revision: profile.revision + 1 };
}
