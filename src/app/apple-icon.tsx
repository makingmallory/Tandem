import { ImageResponse } from "next/og";
import { APP_BRAND } from "@/config/brand";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: APP_BRAND.themeColor,
        }}
      >
        <div
          style={{
            width: 104,
            height: 104,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 8,
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#fff8eb",
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              width: 92,
              height: 66,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              borderRadius: 18,
              background: "#fff8eb",
            }}
          >
            <div
              style={{
                width: 28,
                height: 42,
                borderRadius: "12px 12px 0 0",
                background: "#f3bec0",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
