import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "AI-Newsletter-Bot/1.0",
  },
});

// 全面覆盖 AI 领域的 RSS 源
const RSS_FEEDS = [
  // === 综合 AI 新闻 ===
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
  },
  {
    name: "The Verge AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  },
  {
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed/",
  },
  {
    name: "MIT Tech Review",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
  },
  {
    name: "Ars Technica AI",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
  },

  // === AI 研究 & 开源 ===
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
  },
  {
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
  },
  {
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
  },
  {
    name: "Anthropic Blog",
    url: "https://www.anthropic.com/feed.xml",
  },
  {
    name: "Meta AI Blog",
    url: "https://ai.meta.com/blog/rss/",
  },

  // === AI 深度分析 ===
  {
    name: "The Gradient",
    url: "https://thegradient.pub/rss/",
  },
  {
    name: "Interconnects (Nathan Lambert)",
    url: "https://www.interconnects.ai/feed",
  },
  {
    name: "Simon Willison",
    url: "https://simonwillison.net/atom/everything/",
  },

  // === 开发者工具 & Infra ===
  {
    name: "LangChain Blog",
    url: "https://blog.langchain.dev/rss/",
  },

  // === 中文 AI 新闻 ===
  {
    name: "机器之心",
    url: "https://www.jiqizhixin.com/rss",
  },
  {
    name: "量子位",
    url: "https://www.qbitai.com/feed",
  },

  // === 社区 ===
  {
    name: "Hacker News (AI)",
    url: "https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude+OR+transformer&points=50",
  },
  {
    name: "Reddit r/MachineLearning",
    url: "https://www.reddit.com/r/MachineLearning/hot.json?limit=10&raw_json=1",
  },
];

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
}

async function fetchFeed(feed: {
  name: string;
  url: string;
}): Promise<NewsItem[]> {
  try {
    // Reddit JSON API 特殊处理
    if (feed.url.includes("reddit.com") && feed.url.endsWith(".json?limit=10&raw_json=1")) {
      return await fetchReddit(feed);
    }

    const result = await parser.parseURL(feed.url);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 36 * 60 * 60 * 1000); // 36h window

    return (result.items || [])
      .filter((item) => {
        const pubDate = item.pubDate ? new Date(item.pubDate) : now;
        return pubDate >= oneDayAgo;
      })
      .slice(0, 8)
      .map((item) => ({
        title: item.title || "Untitled",
        link: item.link || "",
        source: feed.name,
        pubDate: item.pubDate || now.toISOString(),
        snippet: cleanSnippet(
          item.contentSnippet || item.content || item.summary || ""
        ),
      }));
  } catch (error) {
    console.error(`Failed to fetch ${feed.name}: ${error}`);
    return [];
  }
}

async function fetchReddit(feed: {
  name: string;
  url: string;
}): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "AI-Newsletter-Bot/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const posts = data?.data?.children || [];
    return posts.slice(0, 8).map((post: any) => ({
      title: post.data?.title || "Untitled",
      link: `https://reddit.com${post.data?.permalink || ""}`,
      source: feed.name,
      pubDate: new Date((post.data?.created_utc || 0) * 1000).toISOString(),
      snippet: cleanSnippet(post.data?.selftext || "").slice(0, 300),
    }));
  } catch {
    return [];
  }
}

function cleanSnippet(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export async function collectNews(): Promise<NewsItem[]> {
  const feedPromises = RSS_FEEDS.map((feed) => fetchFeed(feed));
  const results = await Promise.allSettled(feedPromises);

  const allNews: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allNews.push(...result.value);
    }
  }

  // 去重（标题相似度）
  const seen = new Set<string>();
  const deduplicated = allNews.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 按时间排序
  deduplicated.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  console.log(
    `Collected ${deduplicated.length} unique news items from ${RSS_FEEDS.length} feeds`
  );
  return deduplicated;
}
