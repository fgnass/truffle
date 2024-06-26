export function ScoreBox({
  category,
  score,
  prevScore,
  onClick,
}: {
  category: string;
  score: number | null;
  prevScore?: number | null;
  onClick?: () => unknown;
}) {
  const animate = prevScore === null && score !== null;
  return (
    <div
      class="border-b border-neutral-400 p-1 grid grid-cols-[5fr_2fr] items-end min-h-10"
      onClick={onClick}
    >
      <div class="w-[min(4rem,100%)] justify-self-start text-xs leading-tight">
        {category}
      </div>
      <div class="font-digits justify-self-end text-blue-700 leading-none text-lg">
        {score !== null && (
          <div class={animate ? "animate-writeDown" : ""}>
            {score === 0 ? "–" : score}
          </div>
        )}
      </div>
    </div>
  );
}
