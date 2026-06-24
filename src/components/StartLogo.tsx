import { useEffect, useRef, useState } from "preact/hooks";
import { Pig } from "./Pig";
import { TruffleLogo } from "./TruffleLogo";

const LOGO_ANIMATION_MS = 5000;

export function StartLogo() {
  const [replayKey, setReplayKey] = useState(0);
  const playingRef = useRef(true);

  useEffect(() => {
    playingRef.current = true;
    const done = window.setTimeout(() => {
      playingRef.current = false;
    }, LOGO_ANIMATION_MS);
    return () => window.clearTimeout(done);
  }, [replayKey]);

  const replay = () => {
    if (playingRef.current) return;
    playingRef.current = true;
    setReplayKey((key) => key + 1);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={replay}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          replay();
        }
      }}
      aria-label="Replay logo animation"
      class="flex cursor-pointer flex-col items-center text-ink outline-hidden"
    >
      <Pig
        key={replayKey}
        class="w-52 h-auto text-primary-950 drop-emboss translate-x-2"
      />
      <TruffleLogo class="relative -mt-7 w-52 h-auto drop-emboss" />
    </div>
  );
}
