import React from 'react';
import katex from 'katex';
import { detectMalformedLatex, formatMathExpressionsToKaTeX } from '../lib/cbtLogic';

interface MathTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'div' | 'p';
  showAdminLatexWarning?: boolean;
  onFlagMalformedLatex?: (issues: string[]) => void;
}

/**
 * Renders Grade 7 CBT text containing inline ($...$, \(...\)) or display ($$...$$, \[...\])
 * mathematical expressions using KaTeX.
 *
 * Security & Resilience:
 * - Untrusted input is strictly sandboxed (`trust: false`, `maxExpand: 100`).
 * - Prose segments are rendered as React text nodes (never raw HTML).
 * - Malformed LaTeX degrades gracefully into a readable mathematical fallback without breaking layout.
 */
export const MathText: React.FC<MathTextProps> = ({
  text,
  className = '',
  as: Component = 'span',
  showAdminLatexWarning = false,
  onFlagMalformedLatex,
}) => {
  if (!text) return null;

  const diagnostic = detectMalformedLatex(text);
  const normalizedText = formatMathExpressionsToKaTeX(text);
  const parts = normalizedText.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  const renderErrors: string[] = [...diagnostic.issues];

  const renderedNodes = parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
      const latex = part.slice(2, -2).trim();
      try {
        if (/\\(?:href|url|htmlData|includegraphics|input|include|write18)\b/i.test(latex)) {
          throw new Error('Restricted LaTeX macro');
        }
        const html = katex.renderToString(latex, {
          displayMode: true,
          throwOnError: true,
          strict: 'ignore',
          trust: false,
          maxExpand: 100,
        });
        return (
          <span
            key={idx}
            className="cbt-math-display my-2 block max-w-full overflow-x-auto py-1"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (err: any) {
        renderErrors.push(err?.message || `Malformed display math: ${latex}`);
        return (
          <code
            key={idx}
            className="my-1.5 inline-block max-w-full overflow-x-auto rounded border border-amber-300 bg-amber-50/70 px-2 py-0.5 font-mono text-[0.92em] text-slate-800"
            title="Fallback math representation"
          >
            {latex}
          </code>
        );
      }
    }

    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const latex = part.slice(1, -1).trim();
      try {
        if (/\\(?:href|url|htmlData|includegraphics|input|include|write18)\b/i.test(latex)) {
          throw new Error('Restricted LaTeX macro');
        }
        const html = katex.renderToString(latex, {
          displayMode: false,
          throwOnError: true,
          strict: 'ignore',
          trust: false,
          maxExpand: 100,
        });
        return (
          <span
            key={idx}
            className="cbt-math-inline mx-0.5 inline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (err: any) {
        renderErrors.push(err?.message || `Malformed inline math: ${latex}`);
        return (
          <code
            key={idx}
            className="mx-0.5 inline-block max-w-full overflow-x-auto rounded border border-amber-300 bg-amber-50/70 px-1.5 py-0.2 font-mono text-[0.92em] text-slate-800"
            title="Fallback math representation"
          >
            {latex}
          </code>
        );
      }
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });

  const hasMalformed = renderErrors.length > 0;

  return (
    <Component className={`cbt-math-container break-words ${className}`.trim()}>
      {renderedNodes}
      {hasMalformed && showAdminLatexWarning && (
        <span className="ml-2 inline-flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 align-middle">
          <span>LaTeX syntax needs review</span>
          {onFlagMalformedLatex && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFlagMalformedLatex(Array.from(new Set(renderErrors)));
              }}
              className="underline hover:text-amber-950 cursor-pointer"
            >
              Flag Question
            </button>
          )}
        </span>
      )}
    </Component>
  );
};
