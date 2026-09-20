import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#2f4b3c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: "50%",
            background: "#f2efe2",
            border: "9px solid #c98a2c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 26,
              left: 51,
              width: 30,
              height: 30,
              background: "#1c231d",
              transform: "rotate(45deg)",
              borderRadius: 5,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 67,
              left: 25,
              width: 30,
              height: 30,
              background: "#1c231d",
              transform: "rotate(45deg)",
              borderRadius: 5,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 67,
              left: 77,
              width: 30,
              height: 30,
              background: "#1c231d",
              transform: "rotate(45deg)",
              borderRadius: 5,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
