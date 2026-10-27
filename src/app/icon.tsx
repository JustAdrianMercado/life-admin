import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export function AppIcon({ px }: { px: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#4f46e5",
        color: "white",
        fontSize: px * 0.55,
        fontWeight: 700,
        borderRadius: px * 0.22,
      }}
    >
      A
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(<AppIcon px={size.width} />, size);
}
