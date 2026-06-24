export function ScoreBox({
  category,
  hint,
  score,
  prevScore,
  onClick,
}: {
  category: string;
  hint?: string;
  score: number | null;
  prevScore?: number | null;
  onClick?: () => unknown;
}) {
  const animate = prevScore === null && score !== null;
  const interactive = !!onClick && score === null;
  return (
    <div
      class={`grid min-h-[2.85rem] grid-cols-[minmax(0,1fr)_2.25rem] items-end rounded-xs border-b border-neutral-300 px-2 py-1 transition-colors ${
        interactive
          ? "cursor-pointer hover:bg-neutral-50 active:bg-primary-50"
          : ""
      }`}
      onClick={onClick}
    >
      <div class="w-full max-w-[5.7rem] justify-self-start text-[0.84em] leading-tight text-neutral-900">
        {category}
        {hint && (
          <div class="mt-0.5 text-[0.82em] leading-tight text-neutral-400">
            {hint}
          </div>
        )}
      </div>
      <div class="justify-self-end font-digits text-[1.35em] leading-none text-ink">
        {score !== null && (
          <div class={animate ? "animate-writeDown" : ""}>
            {score === 0 ? "–" : score}
          </div>
        )}
      </div>
    </div>
  );
}
