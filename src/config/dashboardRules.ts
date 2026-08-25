/**
 * Provisional dashboard prioritisation rules.
 *
 * IMPORTANT: none of these are ratified Crunch Carbon business rules. They exist
 * in one place so they can be reviewed, changed or replaced by real rules
 * without hunting through dashboard components. Until Crunch Carbon defines the
 * final rules, dashboards must use plain factual ordering (longest waiting
 * first) rather than a composite weighted score, and every threshold shown in
 * the UI must be stated in the copy so the user can see the rule being applied.
 */

/**
 * Days since a proposal was sent, after which admin sees it as "no movement".
 * Provisional operational threshold, not a contractual definition of "stalled".
 */
export const NO_MOVEMENT_DAYS = 21;

/**
 * Ordering used by the attention layers.
 * "waiting" = longest outstanding first (factual, explainable).
 * "value"   = highest estimated client value first (factual, explainable).
 */
export type AttentionSort = "waiting" | "value";

export const DEFAULT_ATTENTION_SORT: AttentionSort = "waiting";

export const ATTENTION_SORT_LABEL: Record<AttentionSort, string> = {
  waiting: "Ordered by how long each has been waiting on the client.",
  value: "Ordered by estimated client value.",
};
