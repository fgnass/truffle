import { ComponentChildren } from "preact";

// The white "paper" card used on the leaderboard: a soft drop-shadowed sheet
// (shadow-paper adds grain + a top-to-bottom shade) with a bold title above the
// content. Shared by the per-player scorecard and the highscore list so the two
// stay identical.
export function PaperCard({
  title,
  children,
}: {
  title: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <div class="mx-auto flex w-[500px] max-w-full flex-1 flex-col gap-6 text-sm">
      <div class="relative flex flex-col gap-6 overflow-hidden bg-white p-6 shadow-paper">
        <h1 class="flex min-h-6 items-center gap-1 text-xl leading-none font-bold">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}
