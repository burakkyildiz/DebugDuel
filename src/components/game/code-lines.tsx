"use client";

import { copy } from "@/content/copy.en";

function highlight(line: string) {
  return line.split(/(#.*$|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b(?:def|return|if|else|elif|for|while|in|not|and|or|True|False|None|from|import)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*(?=\s*\())/g)
    .map((part, index) => <span key={index} className={part.startsWith("#") ? "syntax-comment" : /^["']/.test(part) ? "syntax-string" : /^\d/.test(part) ? "syntax-number" : /^(def|return|if|else|elif|for|while|in|not|and|or|True|False|None|from|import)$/.test(part) ? "syntax-keyword" : /^[A-Za-z_]\w*$/.test(part) ? "syntax-function" : undefined}>{part}</span>);
}

export function CodeLines({ code, selected, onSelect, disabled = false, correctLine }: {
  code: string; selected?: number | null; onSelect?: (line: number) => void; disabled?: boolean; correctLine?: number;
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
          <span className="game-line-number" aria-hidden="true">{number}</span><code>{highlight(line || " ")}</code>
          {result && <span className="game-line-result" id={`line-result-${number}`}>{isCorrect ? "✓" : "✕"} {result}</span>}
        </label>;
      })}
    </fieldset> : <pre className="game-code">{lines.map((line, index) => <span key={index} className={`game-code-line ${correctLine === index + 1 ? "correct-line" : ""}`}><span className="game-line-number" aria-hidden="true">{index + 1}</span><code>{highlight(line || " ")}</code></span>)}</pre>}
  </div>;
}
