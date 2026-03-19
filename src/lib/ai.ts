import { NewsItem } from "./sources";

const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";

export interface Newsletter {
  date: string;
  headline: {
    title: string;
    subtitle: string;
  };
  thematicSections: Array<{
    theme: string;
    subtitle: string;
    items: Array<{
      bold_lead: string;
      content: string;
    }>;
  }>;
  topItems: Array<{
    title: string;
    detail: string;
  }>;
  communityBuzz: Array<{
    source: string; // "Reddit" | "Hacker News" | etc
    items: Array<{
      title: string;
      summary: string;
    }>;
  }>;
}

export async function generateNewsletter(
  news: NewsItem[]
): Promise<Newsletter> {
  const today = new Date().toISOString().split("T")[0];

  const newsDigest = news
    .map(
      (item, i) =>
        `[${i + 1}] ${item.source} | ${item.title}\n${item.snippet}\nURL: ${item.link}`
    )
    .join("\n\n");

  const prompt = `你是一位资深的 AI 行业分析师和技术记者，负责撰写类似 Latent Space AINews 风格的每日 AI 行业日报。

今天是 ${today}。以下是今天采集到的 AI 领域新闻原始素材：

${newsDigest}

请基于以上素材，生成一份高质量的 AI 行业日报。风格参考 AINews by swyx (Latent Space)，要求如下：

### 风格要求
- **按主题组织**，而非按公司或信息源组织。找出当天最重要的 3-5 个技术/产业主题线索
- 每个主题下，用 **加粗引导句 + 详细展开** 的写法（如"MiniMax M2.7 is the headline model release: ..."）
- 内容要有 **技术深度**，不是泛泛而谈，要点出具体数字、benchmark 分数、技术细节
- 中文撰写，但技术术语保留英文（如 SWE-Pro, HBM, MCP, RAG 等）
- 语气专业但不枯燥，像一位懂技术的投资人在分享见解

### 输出结构
请严格返回以下 JSON 格式（不要包含 markdown 代码块标记）：

{
  "date": "${today}",
  "headline": {
    "title": "一句话概括今天最大的新闻（中英混排）",
    "subtitle": "一句简短评论"
  },
  "thematicSections": [
    {
      "theme": "主题名称（如：模型发布与性能前沿、Agent 框架与工具链演进、基础设施与系统优化、应用落地与商业化、监管与行业动态）",
      "subtitle": "该主题的一句话总结",
      "items": [
        {
          "bold_lead": "加粗引导句，一句话概括要点",
          "content": "详细展开 2-4 句话，包含具体数字、技术细节、影响分析。引用具体的 benchmark 分数、公司名、产品名等。"
        }
      ]
    }
  ],
  "topItems": [
    {
      "title": "值得关注的热门话题/推文/讨论",
      "detail": "简要描述为什么值得关注"
    }
  ],
  "communityBuzz": [
    {
      "source": "社区来源（如 Reddit, Hacker News, Twitter）",
      "items": [
        {
          "title": "讨论标题",
          "summary": "社区讨论的核心观点和争论焦点"
        }
      ]
    }
  ]
}`;

  const response = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.MINIMAX_MODEL || "MiniMax-Text-01",
      messages: [
        {
          role: "system",
          content:
            "你是一位顶尖的 AI 行业分析师和技术作家，擅长将碎片化的技术新闻整合为有深度的主题分析。你的读者是 AI 领域的从业者、研究者和投资人。请严格按照用户要求的 JSON 格式返回内容，不要添加任何额外文字或 markdown 标记。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const responseText =
    data.choices?.[0]?.message?.content || data.reply || "";

  try {
    const cleaned = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as Newsletter;
  } catch {
    console.error("Failed to parse AI response:", responseText.slice(0, 300));
    return {
      date: today,
      headline: {
        title: "AI Daily — " + today,
        subtitle: "今日日报生成中",
      },
      thematicSections: [],
      topItems: [],
      communityBuzz: [],
    };
  }
}
