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
        class="drop-emboss h-auto w-52 translate-x-2 text-primary-950"
      />
      <TruffleLogo class="drop-emboss relative -mt-7 h-auto w-52" />
    </div>
  );
}
