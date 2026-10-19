import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        background: "var(--c-ink)",
        color: "#fff",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div style={{ display: "grid", gap: 24, justifyItems: "center" }}>
        <p className="eyebrow">404</p>
        <h1 style={{ fontSize: 44, lineHeight: 1.15, letterSpacing: "-0.02em" }}>Страница не найдена</h1>
        <Link href="/" className="mono caps" style={{ fontSize: 12, color: "var(--c-mint)" }}>
          На главную
        </Link>
      </div>
    </main>
  );
}
