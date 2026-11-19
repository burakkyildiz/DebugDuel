"use client";

import { copy } from "@/content/copy.en";
import { defaultLanguage, type GameLanguage } from "@/lib/game/languages";

const syntax: Record<GameLanguage, { comment: string; keywords: string }> = {
  python: { comment: "#", keywords: "def|return|if|else|elif|for|while|in|not|and|or|True|False|None|from|import" },
  javascript: { comment: "//", keywords: "function|return|if|else|for|while|of|in|const|let|var|new|async|await|true|false|null|undefined|typeof|throw|break|continue" },
};

function highlight(line: string, language: GameLanguage) {
  const { comment, keywords } = syntax[language];
  const commentPattern = comment === "#" ? "#.*$" : "\\/\\/.*$";
  const stringPattern = language === "javascript" ? "'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\"|`(?:\\\\.|[^`\\\\])*`" : "'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\"";
  const splitter = new RegExp(`(${commentPattern}|${stringPattern}|\\b(?:${keywords})\\b|\\b\\d+(?:\\.\\d+)?\\b|\\b[A-Za-z_]\\w*(?=\\s*\\())`, "g");
  const keyword = new RegExp(`^(${keywords})$`);
  return line.split(splitter)
    .map((part, index) => <span key={index} className={part.startsWith(comment) ? "syntax-comment" : /^["'`]/.test(part) ? "syntax-string" : /^\d/.test(part) ? "syntax-number" : keyword.test(part) ? "syntax-keyword" : /^[A-Za-z_]\w*$/.test(part) ? "syntax-function" : undefined}>{part}</span>);
}

export function CodeLines({ code, selected, onSelect, disabled = false, correctLine, language = defaultLanguage }: {
  language?: GameLanguage; code: string; selected?: number | null; onSelect?: (line: number) => void; disabled?: boolean; correctLine?: number;
}) {
  const lines = code.split("\n");
  return <div className="game-code-scroll">
    {onSelect ? <fieldset className="game-code"><legend className="sr-only">{copy.practice.codeLabel}</legend>
      {lines.map((line, index) => {
        const number = index + 1;
        const isCorrect = correctLine === number;
        const isWrong = correctLine !== undefined && selected === number && !isCorrect;
        const result = isCorrect ? `${copy.practice.correctLine}${selected === number ? ` · ${copy.practice.yourAnswer}` : ""}` : isWrong ? copy.practice.yourAnswer : null;
        return <label key={index} className={`game-code-line ${isCorrect ? "correct-line" : isWrong ? "incorrect-line" : selected === number ? "selected" : ""}`}>
          <input type="radio" name="faulty-line" aria-label={`${copy.practice.lineLabel} ${number}`} aria-describedby={result ? `line-result-${number}` : undefined} checked={selected === number} disabled={disabled} onChange={() => onSelect(number)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); onSelect(number); } }} />
          <span className="game-line-number" aria-hidden="true">{number}</span><code>{highlight(line || " ", language)}</code>
          {result && <span className="game-line-result" id={`line-result-${number}`}>{isCorrect ? "✓" : "✕"} {result}</span>}
        </label>;
      })}
    </fieldset> : <pre className="game-code">{lines.map((line, index) => <span key={index} className={`game-code-line ${correctLine === index + 1 ? "correct-line" : ""}`}><span className="game-line-number" aria-hidden="true">{index + 1}</span><code>{highlight(line || " ", language)}</code></span>)}</pre>}
  </div>;
}
