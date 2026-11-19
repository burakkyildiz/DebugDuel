"use client";

import { copy } from "@/content/copy.en";
import { gameLanguages, languageNames, type GameLanguage } from "@/lib/game/languages";

export function LanguagePicker({ value, onChange, disabled = false }: { value: GameLanguage; onChange: (language: GameLanguage) => void; disabled?: boolean }) {
  return <fieldset className="language-picker" disabled={disabled}>
    <legend className="eyebrow">{copy.languages.label}</legend>
    <div className="language-options">
      {gameLanguages.map(language => <label key={language} className={`language-option${value === language ? " selected" : ""}`}>
        <input type="radio" name="language" value={language} checked={value === language} onChange={() => onChange(language)} />
        <span>{languageNames[language]}</span>
      </label>)}
    </div>
  </fieldset>;
}
