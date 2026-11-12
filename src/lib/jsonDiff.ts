import { isPlainObject } from "@/lib/utils";

export type ChangeKind = "added" | "removed" | "changed";

export interface Change {
  kind: ChangeKind;
  /** JSONPath of the value; for removals, its index on the left; otherwise on the right. */
  path: string;
  before?: unknown;
  after?: unknown;
}

export interface DiffOptions {
  /** Compare arrays as unordered collections (multisets) instead of sequences. */
  ignoreArrayOrder: boolean;
}

/** Arrays needing more edits than this are compared index by index instead of aligned. */
const MAX_EDITS = 2000;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** Path segments in the bracket syntax lib/jsonPath.ts reads back. */
const childPath = (path: string, key: string | number) =>
  typeof key === "number" ? `${path}[${key}]` : IDENTIFIER.test(key) ? `${path}.${key}` : `${path}['${key.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}']`;

/** A key for deep equality: object keys are sorted, so key order never matters. */
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

/** Pairs of equal items (left index, right index) in a longest common subsequence. */
const align = (left: string[], right: string[]): [number, number][] => {
  const n = left.length;
  const m = right.length;
  // Trim the shared prefix and suffix first; most real edits are local.
  let start = 0;
  while (start < n && start < m && left[start] === right[start]) start++;
  let endL = n;
  let endR = m;
  while (endL > start && endR > start && left[endL - 1] === right[endR - 1]) {
    endL--;
    endR--;
  }
  const pairs: [number, number][] = [];
  for (let i = 0; i < start; i++) pairs.push([i, i]);

  const middle = myers(left.slice(start, endL), right.slice(start, endR), MAX_EDITS);
  if (middle) {
    for (const [i, j] of middle) pairs.push([start + i, start + j]);
  } else {
    // Too many edits to align: fall back to matching by position.
    for (let i = start; i < Math.min(endL, endR); i++) if (left[i] === right[i]) pairs.push([i, i]);
  }
  for (let k = 0; k < n - endL; k++) pairs.push([endL + k, endR + k]);
  return pairs;
};

/**
 * Myers' O((N+M)·D) diff (1986): the longest common subsequence via the shortest edit
 * script. Cost grows with the number of edits D, not the array size, so long arrays with
 * few changes stay fast. Returns null when more than `maxEdits` edits are needed.
 */
const myers = (a: string[], b: string[], maxEdits: number): [number, number][] | null => {
  const n = a.length;
  const m = b.length;
  // trace[d][k + d] is the furthest x reached on diagonal k (x - y) after d edits.
  const trace: Int32Array[] = [];
  let found = -1;
  for (let d = 0; d <= Math.min(maxEdits, n + m) && found < 0; d++) {
    const v = new Int32Array(2 * d + 1);
    const prev = trace[d - 1];
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (d === 0) x = 0;
      else if (k === -d || (k !== d && prev[k - 1 + d - 1] < prev[k + 1 + d - 1])) x = prev[k + 1 + d - 1]; // insertion
      else x = prev[k - 1 + d - 1] + 1; // deletion
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[k + d] = x;
      if (x >= n && y >= m) {
        found = d;
        break;
      }
    }
    trace.push(v);
  }
  if (found < 0) return null;

  const pairs: [number, number][] = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const prev = trace[d - 1];
    const k = x - y;
    const prevK = k === -d || (k !== d && prev[k - 1 + d - 1] < prev[k + 1 + d - 1]) ? k + 1 : k - 1;
    const prevX = prev[prevK + d - 1];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) pairs.push([--x, --y]);
    x = prevX;
    y = prevY;
  }
  while (x > 0 && y > 0) pairs.push([--x, --y]);
  return pairs.reverse();
};

const diffArrays = (a: unknown[], b: unknown[], path: string, options: DiffOptions, out: Change[]) => {
  const keysA = a.map(canonical);
  const keysB = b.map(canonical);

  if (options.ignoreArrayOrder) {
    const unmatched = new Map<string, number[]>();
    keysB.forEach((key, index) => unmatched.set(key, [...(unmatched.get(key) ?? []), index]));
    const removed: number[] = [];
    keysA.forEach((key, index) => {
      const slots = unmatched.get(key);
      if (slots?.length) slots.shift();
      else removed.push(index);
    });
    const added = [...unmatched.values()].flat().sort((x, y) => x - y);
    for (const index of removed) out.push({ kind: "removed", path: childPath(path, index), before: a[index] });
    for (const index of added) out.push({ kind: "added", path: childPath(path, index), after: b[index] });
    return;
  }

  const pairs = align(keysA, keysB);
  let i = 0;
  let j = 0;
  // Between matched items, pair the most similar leftovers so an edited item shows as a
  // change; unpaired items are removals and additions.
  const flushGap = (untilI: number, untilJ: number) => {
    const offsetI = i;
    const offsetJ = j;
    for (const [gi, gj] of pairGap(a.slice(i, untilI), b.slice(j, untilJ))) {
      while (i < offsetI + gi) out.push({ kind: "removed", path: childPath(path, i), before: a[i++] });
      while (j < offsetJ + gj) out.push({ kind: "added", path: childPath(path, j), after: b[j++] });
      diffValues(a[i++], b[j], childPath(path, j++), options, out);
    }
    while (i < untilI) out.push({ kind: "removed", path: childPath(path, i), before: a[i++] });
    while (j < untilJ) out.push({ kind: "added", path: childPath(path, j), after: b[j++] });
  };
  for (const [pi, pj] of pairs) {
    flushGap(pi, pj);
    i = pi + 1;
    j = pj + 1;
  }
  flushGap(a.length, b.length);
};

/** 0 (unrelated) to 1 (equal). Objects score by shared equal fields, so a record keeps its identity. */
const similarity = (x: unknown, y: unknown): number => {
  if (isPlainObject(x) && isPlainObject(y)) {
    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
    if (keys.size === 0) return 1;
    let same = 0;
    for (const key of keys) if (key in x && key in y && canonical(x[key]) === canonical(y[key])) same++;
    return same === 0 ? 0.05 : same / keys.size;
  }
  if (Array.isArray(x) && Array.isArray(y)) return 0.1;
  return typeof x === typeof y && x !== null && y !== null ? 0.1 : 0;
};

/** Larger gaps are paired in order without scoring, to bound the work. */
const MAX_GAP_CELLS = 2500;

/**
 * Order-preserving pairs (indexes into x and y) that maximise total similarity, found
 * with a weighted LCS. Indexes are offset by the caller.
 */
const pairGap = (x: unknown[], y: unknown[]): [number, number][] => {
  if (x.length === 0 || y.length === 0) return [];
  if (x.length * y.length > MAX_GAP_CELLS) return Array.from({ length: Math.min(x.length, y.length) }, (_, k) => [k, k] as [number, number]);
  const score = x.map((left) => y.map((right) => similarity(left, right)));
  const best = Array.from({ length: x.length + 1 }, () => new Float64Array(y.length + 1));
  for (let p = x.length - 1; p >= 0; p--) {
    for (let q = y.length - 1; q >= 0; q--) {
      const take = score[p][q] > 0 ? score[p][q] + best[p + 1][q + 1] : -1;
      best[p][q] = Math.max(take, best[p + 1][q], best[p][q + 1]);
    }
  }
  const result: [number, number][] = [];
  let p = 0;
  let q = 0;
  while (p < x.length && q < y.length) {
    if (score[p][q] > 0 && best[p][q] === score[p][q] + best[p + 1][q + 1]) result.push([p++, q++]);
    else if (best[p][q] === best[p + 1][q]) p++;
    else q++;
  }
  return result;
};

const diffValues = (a: unknown, b: unknown, path: string, options: DiffOptions, out: Change[]) => {
  if (Array.isArray(a) && Array.isArray(b)) return diffArrays(a, b, path, options, out);
  if (isPlainObject(a) && isPlainObject(b)) {
    for (const key of Object.keys(a)) {
      const child = childPath(path, key);
      if (!Object.prototype.hasOwnProperty.call(b, key)) out.push({ kind: "removed", path: child, before: a[key] });
      else diffValues(a[key], b[key], child, options, out);
    }
    for (const key of Object.keys(b)) {
      if (!Object.prototype.hasOwnProperty.call(a, key)) out.push({ kind: "added", path: childPath(path, key), after: b[key] });
    }
    return;
  }
  if (canonical(a) !== canonical(b)) out.push({ kind: "changed", path, before: a, after: b });
};

/** Every difference between two JSON values, in document order. Key order is ignored. */
export const diffJson = (a: unknown, b: unknown, options: DiffOptions): Change[] => {
  const out: Change[] = [];
  diffValues(a, b, "$", options, out);
  return out;
};

/** Compact one-line JSON for the results list. */
export const previewValue = (value: unknown, max = 120) => {
  const text = JSON.stringify(value) ?? "undefined";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/** A plain-text report, one change per line, for copying. */
export const diffReport = (changes: Change[]) =>
  changes
    .map((change) =>
      change.kind === "added"
        ? `+ ${change.path}: ${previewValue(change.after, 500)}`
        : change.kind === "removed"
          ? `- ${change.path}: ${previewValue(change.before, 500)}`
          : `~ ${change.path}: ${previewValue(change.before, 500)} → ${previewValue(change.after, 500)}`
    )
    .join("\n");
