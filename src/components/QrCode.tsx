import QRCode from "qrcode";
import { useEffect, useState } from "preact/hooks";

// Renders `value` as a crisp SVG QR code. Generation only — guests scan it with
// their phone's native camera, which opens the join link in the browser.
export function QrCode({
  value,
  class: className = "",
}: {
  value: string;
  class?: string;
}) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let alive = true;
    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1f1147", light: "#ffffff00" },
    })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(""));
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <div
      class={`[&>svg]:h-full [&>svg]:w-full ${className}`}
      // The SVG is generated locally from a fixed value — no untrusted input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
