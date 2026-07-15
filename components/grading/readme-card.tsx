"use client";

import { useState } from "react";
import { TechIcon } from "@/components/ui/tech-icon";

/**
 * Renders the project's REAL GitHub README in the grading view.
 *
 * The README comes from an untrusted source (any team's repo), so it is rendered as
 * React nodes, never via dangerouslySetInnerHTML, by a tiny markdown subset parser.
 * All text reaches the DOM as escaped React children, so there's no XSS surface. We
 * cover the markdown judges actually see (headings, bold, inline code, links, lists,
 * fenced code blocks) and treat everything else as plain text.
 */

const LINK_SAFE = /^https?:\/\//i;

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // **bold** | `code` | [label](http-url)
  const pattern = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/;
  let remaining = text;
  let i = 0;
  while (remaining) {
    const m = remaining.match(pattern);
    if (!m || m.index === undefined) {
      nodes.push(remaining);
      break;
    }
    if (m.index > 0) nodes.push(remaining.slice(0, m.index));
    if (m[1]) {
      nodes.push(
        <strong key={`${keyBase}-${i++}`} className="font-semibold text-ink">
          {m[2]}
        </strong>,
      );
    } else if (m[3]) {
      nodes.push(
        <code key={`${keyBase}-${i++}`} className="rounded bg-sunken px-1 py-0.5 font-mono text-[11.5px] text-ink">
          {m[4]}
        </code>,
      );
    } else if (m[5] && LINK_SAFE.test(m[7])) {
      nodes.push(
        <a
          key={`${keyBase}-${i++}`}
          href={m[7]}
          target="_blank"
          rel="noreferrer nofollow"
          className="text-accent underline-offset-2 hover:underline"
        >
          {m[6]}
        </a>,
      );
    }
    remaining = remaining.slice(m.index + m[0].length);
  }
  return nodes;
}

function renderMarkdown(md: string): React.ReactNode[] {
  // Drop images and HTML comments, neither is useful (or safe) inline here.
  const cleaned = md
    .replace(/\r\n/g, "\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const lines = cleaned.split("\n");
  const out: React.ReactNode[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let key = 0;

  const flushCode = () => {
    if (codeBuf.length) {
      out.push(
        <pre
          key={`c-${key++}`}
          className="my-2 overflow-x-auto rounded-[8px] border border-line bg-sunken p-3 font-mono text-[11px] leading-[1.5] text-ink"
        >
          {codeBuf.join("\n")}
        </pre>,
      );
      codeBuf = [];
    }
  };

  // Split a "| a | b |" row into trimmed cells; detect the "|---|---|" separator.
  const splitRow = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const isTableSep = (l: string | undefined) =>
    Boolean(l) && /\|/.test(l as string) && /-/.test(l as string) && /^[\s|:-]+$/.test((l as string).trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    // Markdown table: a "| a | b |" header followed by a "|---|---|" separator row.
    if (line.includes("|") && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim() && lines[j].includes("|")) {
        rows.push(splitRow(lines[j]));
        j++;
      }
      out.push(
        <div key={`tbl-${key++}`} className="my-2.5 overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {header.map((h, ci) => (
                  <th
                    key={ci}
                    className="border border-line bg-raised px-2.5 py-1.5 text-left font-semibold text-ink"
                  >
                    {renderInline(h, `th${key}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {header.map((_, ci) => (
                    <td key={ci} className="border border-line px-2.5 py-1.5 align-top text-dim">
                      {renderInline(r[ci] ?? "", `td${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i = j - 1;
      continue;
    }
    // Thematic break (---, ***, ___).
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      out.push(<hr key={`hr-${key++}`} className="my-3 border-line-soft" />);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const size = level <= 1 ? "text-[15.5px]" : level === 2 ? "text-[14px]" : "text-[13px]";
      out.push(
        <div key={`h-${key++}`} className={`mb-1 mt-3 font-semibold tracking-[-0.01em] text-ink ${size}`}>
          {renderInline(h[2], `h${key}`)}
        </div>,
      );
      continue;
    }
    const li = line.match(/^\s*[-*+]\s+(.*)$/);
    if (li) {
      out.push(
        <div key={`li-${key++}`} className="ml-2 flex gap-2 text-[12.5px] leading-[1.55] text-dim">
          <span className="mt-px text-faint">•</span>
          <span>{renderInline(li[1], `li${key}`)}</span>
        </div>,
      );
      continue;
    }
    if (!line.trim()) {
      out.push(<div key={`sp-${key++}`} className="h-2" />);
      continue;
    }
    out.push(
      <p key={`p-${key++}`} className="text-[12.5px] leading-[1.6] text-dim">
        {renderInline(line, `p${key}`)}
      </p>,
    );
  }
  flushCode();
  return out;
}

export function ReadmeCard({ readme, repoUrl }: { readme: string; repoUrl?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = readme.trim();
  if (!trimmed) return null;
  // Collapse long READMEs behind a "Show full README" toggle.
  const long = trimmed.length > 1400;

  return (
    <div className="rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TechIcon name="GitHub" className="h-4 w-4 text-ink" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">README</span>
        </div>
        <span className="font-mono text-[10.5px] text-faint">from the repo</span>
      </div>

      <div
        className={
          long && !expanded
            ? "relative max-h-[360px] overflow-hidden"
            : "relative max-h-[640px] overflow-y-auto pr-1"
        }
      >
        <div className="prose-readme">{renderMarkdown(trimmed)}</div>
        {long && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
        )}
      </div>

      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-control border border-line bg-raised px-4 py-2 text-[12.5px] font-medium text-ink transition-colors hover:border-ink"
        >
          {expanded ? "Show less" : "Show full README"}
        </button>
      )}
    </div>
  );
}
