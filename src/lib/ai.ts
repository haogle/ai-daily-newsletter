import Anthropic from "@anthropic-ai/sdk";
import { NewsItem } from "./sources";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface Newsletter {
  date: string;
  highlights: Array<{
    emoji: string;
    title: string;
    summary: string;
    analysis: string;
    investmentImplication: string;
  }>;
  industryTrends: Array<{
    category: string;
    items: Array<{
      title: string;
      content: string;
    }>;
  }>;
  companyNews: Array<{
    company: string;
    items: string[];
  }>;
}

export async function generateNewsletter(
  news: NewsItem[]
): Promise<Newsletter> {
  const today = new Date().toISOString().split("T")[0];

  // 构造 news digest 给 AI
  const newsDigest = news
    .map(
      (item, i) =>
        `[${i + 1}] ${item.source} | ${item.title}\n${item.snippet}\nURL: ${item.link}`
    )
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `你是一位资深的 AI/大模型行业分析师，负责撰写每日行业日报。

今天是 ${today}。以下是今天采集到的 AI 领域新闻：

${newsDigest}

请基于以上新闻，生成一份结构化的 AI 行业日报，要求：

1. **今日重点**：挑选 2-3 条最重要的新闻，每条包含：
   - emoji 标记（🟢 利好 / 🔴 利空 / 🟡 中性）
   - 标题（中文，简洁有力）
   - 摘要（2-3句话描述事件）
   - 观点（你的分析视角）
   - 投资含义（对相关公司/行业的影响）

2. **产业动态**：按主题分类（如"大模型进展"、"AI应用落地"、"AI基础设施"、"监管与政策"等），每个分类下汇总关键信息。

3. **公司新闻**：按公司分类（如 OpenAI、Google、Meta、Anthropic、百度等），列出各家动态。

请严格返回以下 JSON 格式（不要包含任何 markdown 代码块标记）：

{
  "date": "${today}",
  "highlights": [
    {
      "emoji": "🟢",
      "title": "标题",
      "summary": "摘要",
      "analysis": "观点分析",
      "investmentImplication": "投资含义"
    }
  ],
  "industryTrends": [
    {
      "category": "分类名称",
      "items": [
        { "title": "小标题", "content": "内容" }
      ]
    }
  ],
  "companyNews": [
    {
      "company": "公司名",
      "items": ["动态1", "动态2"]
    }
  ]
}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    // 尝试直接解析 JSON
    const cleaned = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as Newsletter;
  } catch {
    console.error("Failed to parse AI response, using fallback");
    return {
      date: today,
      highlights: [
        {
          emoji: "🟡",
          title: "AI 日报生成中",
          summary: "今日新闻正在处理中，请稍后查看。",
          analysis: "系统正在优化中。",
          investmentImplication: "暂无。",
        },
      ],
      industryTrends: [],
      companyNews: [],
    };
  }
}
