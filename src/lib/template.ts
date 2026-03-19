import { Newsletter } from "./ai";

export function renderEmailHTML(newsletter: Newsletter): string {
  const { date, headline, thematicSections, topItems, communityBuzz } =
    newsletter;

  // 主题板块
  const sectionsHTML = thematicSections
    .map(
      (section) => `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 4px 0; font-size: 20px; color: #1a1a1a; font-weight: 700;">${section.theme}</h2>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #8b5cf6; font-weight: 500;">${section.subtitle}</p>
      ${section.items
        .map(
          (item) => `
        <div style="margin-bottom: 16px; padding-left: 16px; border-left: 3px solid #e9d5ff;">
          <p style="margin: 0; font-size: 14px; color: #1a1a1a; line-height: 1.7;">
            <strong>${item.bold_lead}</strong>：${item.content}
          </p>
        </div>`
        )
        .join("")}
    </div>`
    )
    .join("");

  // 热门话题
  const topItemsHTML = topItems.length
    ? `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1a1a1a; font-weight: 700;">🔥 Top Highlights</h2>
      ${topItems
        .map(
          (item) => `
        <div style="margin-bottom: 12px; padding: 12px 16px; background: #faf5ff; border-radius: 8px;">
          <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #7c3aed;">${item.title}</p>
          <p style="margin: 0; font-size: 13px; color: #4a4a4a; line-height: 1.5;">${item.detail}</p>
        </div>`
        )
        .join("")}
    </div>`
    : "";

  // 社区讨论
  const communityHTML = communityBuzz.length
    ? `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1a1a1a; font-weight: 700;">💬 Community Buzz</h2>
      ${communityBuzz
        .map(
          (community) => `
        <div style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #6d28d9; font-weight: 600;">${community.source}</h3>
          ${community.items
            .map(
              (item) => `
            <div style="margin-bottom: 8px; padding-left: 12px; border-left: 2px solid #ddd6fe;">
              <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: 600; color: #374151;">${item.title}</p>
              <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">${item.summary}</p>
            </div>`
            )
            .join("")}
        </div>`
        )
        .join("")}
    </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f6; font-family: Georgia, 'Times New Roman', serif;">
  <div style="max-width: 680px; margin: 0 auto; padding: 20px;">

    <!-- Header -->
    <div style="padding: 32px 0 24px 0; text-align: center; border-bottom: 2px solid #1a1a1a;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">
        [AI Daily]
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #9ca3af; font-family: -apple-system, sans-serif;">
        ${date} · AI / 大模型行业日报
      </p>
    </div>

    <!-- Headline -->
    <div style="padding: 24px 0; border-bottom: 1px solid #e5e7eb;">
      <h2 style="margin: 0 0 6px 0; font-size: 22px; color: #1a1a1a; font-weight: 700; line-height: 1.3;">
        ${headline.title}
      </h2>
      <p style="margin: 0; font-size: 15px; color: #7c3aed; font-style: italic;">${headline.subtitle}</p>
    </div>

    <!-- Source info -->
    <div style="padding: 16px 0; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: -apple-system, sans-serif; line-height: 1.5;">
        AI Daily for ${date}. Sources: RSS feeds from TechCrunch, The Verge, VentureBeat, MIT Tech Review,
        Hugging Face, OpenAI, Google AI, Anthropic, LangChain, Hacker News, Reddit, 机器之心, 量子位 and more.
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 24px 0;">
      ${sectionsHTML}
    </div>

    ${topItemsHTML}

    ${communityHTML}

    <!-- Footer -->
    <div style="border-top: 2px solid #1a1a1a; padding-top: 20px; text-align: center;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #9ca3af; font-family: -apple-system, sans-serif;">
        本 newsletter 由 AI 辅助生成（MiniMax），仅供参考，不构成投资建议。
      </p>
      <p style="margin: 0; font-size: 11px; color: #d1d5db; font-family: -apple-system, sans-serif;">
        Generated at ${new Date().toISOString().replace("T", " ").split(".")[0]} UTC
      </p>
    </div>

  </div>
</body>
</html>`;
}
