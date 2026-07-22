/**
 * Safe build/version identifier surfaced in exports and health. Never contains
 * environment configuration or secrets — only a short public build id.
 */
export const PRODUCT_VERSION = process.env.AXON_BUILD_ID ?? "beta";
