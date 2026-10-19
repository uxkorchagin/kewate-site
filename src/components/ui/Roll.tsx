/**
 * Hover text roll. `letters` (menu items, filters): the duplicate word rises letter by letter
 * with a 15ms stagger. Without it the whole line rolls like an odometer — same look, a fraction
 * of the DOM nodes. Screen readers get the plain label once.
 */
export function Roll({ text, letters = false }: { text: string; letters?: boolean }) {
  const chars = Array.from(text);
  const row = (key: string) => (
    <span className={`roll__row roll__row--${key}`} aria-hidden="true">
      {letters ? (
        chars.map((c, i) => (
          <span key={i} className="roll__ch" style={{ ["--i" as string]: i }}>
            {c}
          </span>
        ))
      ) : (
        <span className="roll__ch">{text}</span>
      )}
    </span>
  );
  return (
    <span className="roll">
      <span className="sr-only">{text}</span>
      {row("a")}
      {row("b")}
    </span>
  );
}
