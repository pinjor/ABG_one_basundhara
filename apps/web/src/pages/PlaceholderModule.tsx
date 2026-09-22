export function PlaceholderModule({ label, phase }: { label: string; phase: number }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
      <div className="mb-2 font-display text-2xl font-semibold text-text-dim">{label}</div>
      <p className="max-w-md text-sm text-text-dimmer">
        This module ships in Phase {phase} of the delivery plan. Its data model already exists in the schema so it
        can be wired up without a rewrite when that phase begins.
      </p>
    </div>
  );
}
