/**
 * Renders a project's full Devpost write-up as formatted prose.
 *
 * Devpost write-ups arrive in wildly different shapes: some are clean Markdown
 * ("## Challenges", "- item", "**bold**"); some are plain text with the standard section
 * headings on their own lines; and some teams run a heading straight into its paragraph
 * ("What It Does Boomerang is a multi-agent…"). This renderer normalizes all of them -
 * Markdown headings/bullets/emphasis, bare section headings, AND headings prefixed to a
 * paragraph (split off into a real header). All text reaches the DOM as escaped React
 * children (no dangerouslySetInnerHTML), so an untrusted write-up can't inject markup.
 */

const SECTION_HEADINGS = [
  "what's next for",
  "what's next",
  "whats next",
  "what it does",
  "how we built it",
  "challenges we ran into",
  "challenges we faced",
  "accomplishments that we're proud of",
  "accomplishments that we are proud of",
  "accomplishments that i'm proud of",
  "accomplishments",
  "what we learned",
  "inspiration",
  "built with",
];

/**
 * Devpost appends page metadata after the write-up ("Try it out" links, "Submitted to"
 * the hackathon, "Created by" the team, login prompts). That isn't write-up content, so
 * we stop rendering at the first of these markers.
 */
const STOP_MARKERS = /^(submitted to|created by|try it out|log ?in or sign ?up|sign up for devpost|share this project|updated\b|\+ ?\d+ more)/i;

/**
 * If a line begins with a known section heading, split it into the heading and whatever
 * follows. Only splits when the remainder starts a new sentence (capital letter / digit),
 * so "What it does is clever" (prose) is left alone while "What It Does Boomerang is…"
 * (a run-on heading) becomes a header + paragraph.
 */
function splitLeadingHeading(line: string): { heading: string; rest: string } | null {
  const lower = line.toLowerCase();
  for (const s of SECTION_HEADINGS) {
    if (!lower.startsWith(s)) continue;
    const heading = line.slice(0, s.length).trim();
    const after = line.slice(s.length);
    if (!after.trim()) return { heading, rest: "" }; // heading on its own line
    // – en dash, — em dash: Devpost writeups still contain them.
    const m = after.match(/^[\s:–—-]+(.+)$/);
    if (m && /^[A-Z0-9“"']/.test(m[1].trim())) return { heading, rest: m[1].trim() };
    return null; // the heading word is part of a sentence, treat as a paragraph
  }
  return null;
}

/** Inline Markdown → React nodes: **bold**, *italic* / _italic_, `code`, [text](url). */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern =
    /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*\n]+)\*)|(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/;
  let rest = text;
  let i = 0;
  while (rest) {
    const m = rest.match(pattern);
    if (!m || m.index === undefined) {
      nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    if (m[1]) nodes.push(<strong key={`${keyBase}-${i++}`} className="font-semibold text-ink">{m[2]}</strong>);
    else if (m[3]) nodes.push(<strong key={`${keyBase}-${i++}`} className="font-semibold text-ink">{m[4]}</strong>);
    else if (m[5]) nodes.push(<em key={`${keyBase}-${i++}`}>{m[6]}</em>);
    else if (m[7]) nodes.push(<em key={`${keyBase}-${i++}`}>{m[7]}</em>);
    else if (m[8]) nodes.push(<code key={`${keyBase}-${i++}`} className="rounded bg-sunken px-1 py-0.5 font-mono text-[12px] text-ink">{m[9]}</code>);
    else if (m[10]) nodes.push(<a key={`${keyBase}-${i++}`} href={m[12]} target="_blank" rel="noreferrer nofollow" className="text-accent underline-offset-2 hover:underline">{m[11]}</a>);
    rest = rest.slice(m.index + m[0].length);
  }
  return nodes;
}

export function DevpostWriteup({ text }: { text: string }) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];
  let lastBlock = ""; // de-dupe consecutive identical blocks (Devpost li/p duplication)
  let key = 0;

  const flush = () => {
    if (!bullets.length) return;
    const items = bullets;
    nodes.push(
      <ul key={`ul-${key++}`} className="my-2 flex flex-col gap-1.5">
        {items.map((b, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.55] text-dim">
            <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-faint" />
            <span>{renderInline(b, `li${key}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  const pushHeading = (t: string) => {
    nodes.push(
      <h3
        key={`h-${key++}`}
        className="mb-1.5 mt-5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent first:mt-0"
      >
        {renderInline(t, `h${key}`)}
      </h3>,
    );
  };
  const pushPara = (t: string) => {
    nodes.push(
      <p key={`p-${key++}`} className="mb-2.5 text-[13.5px] leading-[1.62] text-dim">
        {renderInline(t, `p${key}`)}
      </p>,
    );
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    // Markdown heading, bare section heading, or heading run into its paragraph.
    const md = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    let headingText: string | null = null;
    let bodyAfter: string | null = null;
    if (md) {
      headingText = md[2].trim();
    } else {
      const split = splitLeadingHeading(line);
      if (split) {
        headingText = split.heading;
        bodyAfter = split.rest || null;
      }
    }
    const probe = headingText ?? line;
    if (STOP_MARKERS.test(probe)) break;
    if (/^([-*_])\1{2,}$/.test(line)) {
      flush();
      continue;
    }
    if (!md && !headingText && /^[•\-*+]\s+/.test(line)) {
      const b = line.replace(/^[•\-*+]\s+/, "");
      if (b !== lastBlock) {
        bullets.push(b);
        lastBlock = b;
      }
      continue;
    }
    flush();
    if (headingText) {
      pushHeading(headingText);
      if (bodyAfter && bodyAfter !== lastBlock) {
        pushPara(bodyAfter);
        lastBlock = bodyAfter;
      }
    } else if (line !== lastBlock) {
      pushPara(line);
      lastBlock = line;
    }
  }
  flush();

  return <div className="[&>p:last-child]:mb-0">{nodes}</div>;
}
