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
      class={`border-b border-neutral-300 px-2 py-1 grid grid-cols-[minmax(0,1fr)_2.25rem] items-end min-h-[2.85rem] rounded-xs transition-colors ${
        interactive
          ? "cursor-pointer active:bg-primary-50 hover:bg-neutral-50"
          : ""
      }`}
      onClick={onClick}
    >
      <div class="w-full max-w-[5.7rem] justify-self-start text-[0.84em] leading-tight text-neutral-900">
        {category}
        {hint && (
          <div class="text-[0.82em] text-neutral-400 leading-tight mt-0.5">
            {hint}
          </div>
        )}
      </div>
      <div class="font-digits justify-self-end text-ink leading-none text-[1.35em]">
        {score !== null && (
          <div class={animate ? "animate-writeDown" : ""}>
            {score === 0 ? "–" : score}
          </div>
        )}
      </div>
    </div>
  );
}
