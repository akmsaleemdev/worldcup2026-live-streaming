import fc from "fast-check";

// Global fast-check configuration shared by every property-based test.
// Ensures all property tests run at least 100 iterations (Requirement 9.3).
fc.configureGlobal({ numRuns: 100 });

export { fc };
