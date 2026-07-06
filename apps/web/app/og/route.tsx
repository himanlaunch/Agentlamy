import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const logoUrl = new URL("/og-logo.png", request.url).toString();

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="AgentLamy logo"
          height={112}
          src={logoUrl}
          style={{
            border: "3px solid #BCDCCD",
            borderRadius: 999,
            display: "block",
            height: 112,
            marginBottom: 34,
            objectFit: "cover",
            width: 112,
          }}
          width={112}
        />
        <p style={{ color: "#BCDCCD", fontSize: 24, letterSpacing: 4, margin: 0 }}>
          AGENTLAMY
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
