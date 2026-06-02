/**
 * Roleplay message renderer.
 *
 * Talkie / Crushly-style messages mix three things:
 *   - "spoken dialogue"  (plain text)
 *   - *stage directions* / actions (italic narration)
 *   - emphasis (single-word highlights)
 *
 * The model writes them as a single string; we segment client-side instead
 * of sending HTML over the wire, so future model-format changes don't need
 * a server deploy. Output is a typed segment list that the chat renderer
 * walks with semantic styling (italic / muted for narration, bold for
 * emphasis, plain for dialogue).
 *
 * Why a hand-written tokenizer instead of pulling react-markdown:
 * - We only need three constructs, all single-line, no block syntax.
 * - Markdown libraries auto-link URLs and parse headings, both of which we
 *   actively don't want inside chat bubbles (clickable links opened from
 *   a roleplay reply are a phishing surface).
 * - Avoids a ~40KB client bundle add for nine lines of regex.
 *
 * Grammar (single regex pass):
 *   *italic action*   -> { type: 'action',   text }
 *   **bold emphasis** -> { type: 'emphasis', text }
 *   anything else     -> { type: 'speech',   text }
 *
 * `**` is matched first (longer-token-wins) so `**bold**` is never picked
 * up as `*bold*` with a leading/trailing asterisk. Unmatched asterisks stay
 * in the output as-is (defensive for half-typed user input or model
 * stutters), so we never lose characters.
 */

export type MessageSegment =
  | { type: 'speech'; text: string }
  | { type: 'action'; text: string }
  | { type: 'emphasis'; text: string };

// Capture group order matters: `(\*\*[^*]+\*\*)` runs before `(\*[^*]+\*)`
// so `**foo**` greedily wins. The outer alternation lets us walk the input
// linearly without re-scanning. We deliberately disallow `*` inside the
// inner content to keep this single-pass and avoid backtracking.
const TOKEN_RE = /(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)/g;

export function parseMessage(input: string): MessageSegment[] {
  const out: MessageSegment[] = [];
  if (!input) return out;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(input)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      out.push({ type: 'speech', text: input.slice(lastIndex, start) });
    }
    if (match[1]) {
      // **emphasis**
      out.push({ type: 'emphasis', text: match[1].slice(2, -2) });
    } else if (match[2]) {
      // *action*
      out.push({ type: 'action', text: match[2].slice(1, -1) });
    }
    lastIndex = TOKEN_RE.lastIndex;
  }

  if (lastIndex < input.length) {
    out.push({ type: 'speech', text: input.slice(lastIndex) });
  }

  // Reset state for the next caller — RegExp objects with `g` are stateful.
  TOKEN_RE.lastIndex = 0;

  // Collapse runs of identical-typed segments (helps when callers later
  // post-process: e.g. trim whitespace, merge adjacent speech). Cheap.
  return mergeAdjacent(out);
}

function mergeAdjacent(segments: MessageSegment[]): MessageSegment[] {
  if (segments.length < 2) return segments;
  const merged: MessageSegment[] = [];
  for (const seg of segments) {
    const tail = merged[merged.length - 1];
    if (tail && tail.type === seg.type) {
      tail.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}
