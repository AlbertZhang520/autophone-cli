import { createHash } from "node:crypto";
import type { Candidate, Selector, Snapshot, UiNode } from "../contracts/index.js";
import { centerFromBounds, isUsableBounds } from "./bounds.js";

export function findCandidates(snapshot: Snapshot, selector: Selector): Candidate[] {
  const matchingNodes = findMatchingNodes(snapshot, selector);

  const candidates: Candidate[] = [];
  for (const node of matchingNodes) {
    if (!isUsableBounds(node.bounds, snapshot.window_size)) {
      continue;
    }
    candidates.push({
      ...node,
      candidate_index: candidates.length,
      center: centerFromBounds(node.bounds)
    });
  }
  return candidates;
}

export function findMatchingNodes(snapshot: Snapshot, selector: Selector): UiNode[] {
  return snapshot.elements
    .filter((node) => matchesSelector(node, selector))
    .sort((left, right) => left.source_index - right.source_index);
}

export function matchesSelector(node: UiNode, selector: Selector): boolean {
  if (selector.text !== undefined && node.text !== selector.text) {
    return false;
  }
  if (selector.resource_id !== undefined && node.resource_id !== selector.resource_id) {
    return false;
  }
  if (selector.content_desc !== undefined && node.content_desc !== selector.content_desc) {
    return false;
  }
  if (selector.class_name !== undefined && node.class_name !== selector.class_name) {
    return false;
  }
  return true;
}

export function selectorDiagnostics(selector: Selector, candidateCount: number) {
  return {
    fingerprint: selectorFingerprint(selector),
    ambiguity_score: candidateCount <= 1 ? 0 : candidateCount - 1,
    candidate_count: candidateCount
  };
}

export function selectorFingerprint(selector: Selector): string {
  const entries = Object.entries(selector).sort(([left], [right]) => left.localeCompare(right));
  return `sha256:${createHash("sha256").update(JSON.stringify(entries), "utf8").digest("hex")}`;
}
