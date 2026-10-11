export function PageHero({ kicker, title, subtitle, note }: { kicker: string; title: string; subtitle: string; note?: string }) {
  return (
    <section
      className="hero-photo grain relative overflow-hidden rounded-2xl border border-[var(--border-gold)]"
      style={{ backgroundImage: "url(/login-hero.jpg)" }}
    >
      <div className="relative z-[1] max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F4C45B]">{kicker}</p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none text-[#F4C45B] sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#F7F5EE] sm:text-base">{subtitle}</p>
        {note && <p className="mt-4 text-[11px] text-[#A9B3B0]">{note}</p>}
      </div>
    </section>
  );
}
