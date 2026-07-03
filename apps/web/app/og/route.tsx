import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: "#1D2730",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          justifyContent: "center",
          padding: "80px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            border: "2px solid #BCDCCD",
            borderRadius: 18,
            color: "#BCDCCD",
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            height: 72,
            justifyContent: "center",
            marginBottom: 34,
            width: 72,
          }}
        >
          AEO
        </div>
        <p style={{ color: "#BCDCCD", fontSize: 24, letterSpacing: 4, margin: 0 }}>
          AEO COMMAND
        </p>
        <h1 style={{ color: "#FFFFFF", fontSize: 76, lineHeight: 1.02, margin: "18px 0" }}>
          LLM Visibility &
          <br />
          AEO Audit Tool
        </h1>
        <p style={{ color: "#9BB8A8", fontSize: 30, margin: 0 }}>
          See how AI recommends your business vs. competitors.
        </p>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
