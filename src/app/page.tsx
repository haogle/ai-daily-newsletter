export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "20px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
        <h1
          style={{
            color: "#fff",
            fontSize: "28px",
            fontWeight: 700,
            margin: "0 0 8px 0",
          }}
        >
          AI Daily Newsletter
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "16px", margin: "0 0 24px 0" }}>
          AI / 大模型行业日报
        </p>
        <p
          style={{
            color: "#64748b",
            fontSize: "14px",
            lineHeight: 1.6,
            margin: "0 0 32px 0",
          }}
        >
          每日自动采集全球 AI 领域最新动态，由 AI 智能分析生成。
          <br />
          覆盖大模型进展、AI 应用落地、基础设施、公司新闻等。
        </p>
        <div
          style={{
            display: "inline-flex",
            gap: "12px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              background: "rgba(34,197,94,0.15)",
              color: "#22c55e",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "13px",
            }}
          >
            ✅ 每日自动发送
          </span>
          <span
            style={{
              background: "rgba(59,130,246,0.15)",
              color: "#3b82f6",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "13px",
            }}
          >
            🤖 AI 智能分析
          </span>
          <span
            style={{
              background: "rgba(234,179,8,0.15)",
              color: "#eab308",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "13px",
            }}
          >
            📊 投资视角
          </span>
        </div>
        <p
          style={{
            color: "#475569",
            fontSize: "12px",
            marginTop: "40px",
          }}
        >
          Powered by Claude + Vercel + Resend
        </p>
      </div>
    </div>
  );
}
