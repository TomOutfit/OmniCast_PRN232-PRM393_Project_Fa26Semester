// ============================================================
// OmniCast - Skip-to-Content Link (WCAG 2.4.1 Bypass Blocks)
// ------------------------------------------------------------
// A keyboard-only link that lets users jump past the navbar /
// sidebars and straight to the page's main content. Hidden
// visually until focused via the Tab key.
// ============================================================

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        fixed top-2 left-2 z-[200]
        px-4 py-2 rounded-lg
        bg-cyan-500 text-black font-bold text-sm
        shadow-[0_0_20px_rgba(0,242,254,0.6)]
        focus:outline-none focus:ring-2 focus:ring-cyan-300
        transition-transform
        focus:scale-105
      "
    >
      ⏎ Bỏ qua đến nội dung chính
    </a>
  );
}
