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
    <div class="flex-1 flex flex-col gap-6 text-sm w-[500px] max-w-full mx-auto">
      <div class="bg-white shadow-paper p-6 flex flex-col gap-6 relative overflow-hidden">
        <h1 class="font-bold text-xl flex items-center gap-1 leading-none min-h-6">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}
