"use client";

import { useEffect, useId, useRef, useState } from "react";
import { copy } from "@/content/copy.en";
import { gameLanguages, languageNames, type GameLanguage } from "@/lib/game/languages";

/** Dropdown listbox: only the chosen language is shown until the panel is opened. */
export function LanguagePicker({ value, onChange, disabled = false }: { value: GameLanguage; onChange: (language: GameLanguage) => void; disabled?: boolean }) {
  const id = useId();
  const [opened, setOpened] = useState(false);
  const open = opened && !disabled;
  const [active, setActive] = useState(() => gameLanguages.indexOf(value));
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpened(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => { if (open) list.current?.focus(); }, [open]);

  function show() { setActive(gameLanguages.indexOf(value)); setOpened(true); }
  function choose(language: GameLanguage) { onChange(language); setOpened(false); button.current?.focus(); }
  function key(event: React.KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); setOpened(false); button.current?.focus(); }
    else if (event.key === "ArrowDown") { event.preventDefault(); setActive(i => Math.min(i + 1, gameLanguages.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(gameLanguages.length - 1); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(gameLanguages[active]); }
    else if (event.key === "Tab") setOpened(false);
  }

  return <div className="language-picker" ref={root}>
    <span className="eyebrow" id={`${id}-label`}>{copy.languages.label}</span>
    <button ref={button} type="button" className="language-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
      aria-labelledby={`${id}-label ${id}-value`} onClick={() => open ? setOpened(false) : show()}
      onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); show(); } }}>
      <span id={`${id}-value`}>{languageNames[value]}</span>
      <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12"><path d="M2 4.5 6 8.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && <ul ref={list} role="listbox" tabIndex={-1} className="language-panel" aria-labelledby={`${id}-label`} aria-activedescendant={`${id}-${gameLanguages[active]}`} onKeyDown={key}>
      {gameLanguages.map((language, index) => <li key={language} id={`${id}-${language}`} role="option" aria-selected={value === language}
        className={`language-choice${value === language ? " selected" : ""}${index === active ? " active" : ""}`}
        onPointerEnter={() => setActive(index)} onClick={() => choose(language)}>{languageNames[language]}</li>)}
    </ul>}
  </div>;
}
