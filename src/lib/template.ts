import { Newsletter } from "./ai";

export function renderEmailHTML(newsletter: Newsletter): string {
  const { date, highlights, industryTrends, companyNews } = newsletter;

  const highlightsHTML = highlights
    .map(
      (h) => `
    <div style="margin-bottom: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${h.emoji === "🟢" ? "#22c55e" : h.emoji === "🔴" ? "#ef4444" : "#eab308"};">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1a1a1a;">${h.emoji} ${h.title}</h3>
      <p style="margin: 0 0 12px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">${h.summary}</p>
      <div style="margin: 8px 0; padding: 8px 12px; background: #fff; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #666;"><strong>观点：</strong>${h.analysis}</p>
        <p style="margin: 0; font-size: 13px; color: #666;"><strong>投资含义：</strong>${h.investmentImplication}</p>
      </div>
    </div>`
    )
    .join("");

  const trendsHTML = industryTrends
    .map(
      (trend) => `
    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0; font-size: 15px; color: #1a1a1a; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">${trend.category}</h4>
      ${trend.items
        .map(
          (item) => `
        <div style="margin-bottom: 10px; padding-left: 12px;">
          <p style="margin: 0; font-size: 14px; color: #4a4a4a; line-height: 1.6;">
            <strong>${item.title}：</strong>${item.content}
          </p>
        </div>`
        )
        .join("")}
    </div>`
    )
    .join("");

  const companyHTML = companyNews
    .map(
      (company) => `
    <div style="margin-bottom: 16px;">
      <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #1a1a1a;">${company.company}</h4>
      <ul style="margin: 0; padding-left: 20px;">
        ${company.items.map((item) => `<li style="margin-bottom: 4px; font-size: 13px; color: #4a4a4a; line-height: 1.5;">${item}</li>`).join("")}
      </ul>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #fff; font-size: 22px; font-weight: 700;">🤖 AI Daily Newsletter</h1>
      <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">AI / 大模型行业日报</p>
      <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">${date}</p>
    </div>

    <!-- Content -->
    <div style="background: #fff; padding: 24px; border-radius: 0 0 12px 12px;">

      <!-- 今日重点 -->
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1a1a1a;">◆ 今日重点</h2>
        ${highlightsHTML}
      </div>

      ${
        trendsHTML
          ? `
      <!-- 产业动态 -->
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1a1a1a;">产业动态</h2>
        ${trendsHTML}
      </div>`
          : ""
      }

      ${
        companyHTML
          ? `
      <!-- 公司新闻 -->
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1a1a1a;">公司新闻</h2>
        ${companyHTML}
      </div>`
          : ""
      }

      <!-- Footer -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          本 newsletter 由 AI 辅助生成，仅供参考，不构成投资建议。
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af;">
          Generated at ${new Date().toISOString().replace("T", " ").split(".")[0]} UTC
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
