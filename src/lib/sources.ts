import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "AI-Newsletter-Bot/1.0",
  },
});

// AI/大模型领域 RSS 源
const RSS_FEEDS = [
  // 综合 AI 新闻
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
    name: "MIT Technology Review AI",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
  },
  // AI 研究与开源
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
  },
  {
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
  },
  // 中文 AI 新闻
  {
    name: "机器之心",
    url: "https://www.jiqizhixin.com/rss",
  },
  {
    name: "量子位",
    url: "https://www.qbitai.com/feed",
  },
];

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string; // 摘要片段
}

async function fetchFeed(feed: {
  name: string;
  url: string;
}): Promise<NewsItem[]> {
  try {
    const result = await parser.parseURL(feed.url);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return (result.items || [])
      .filter((item) => {
        const pubDate = item.pubDate ? new Date(item.pubDate) : now;
        return pubDate >= oneDayAgo;
      })
      .slice(0, 5) // 每个源最多取5条
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

function cleanSnippet(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // 去除 HTML 标签
    .replace(/\s+/g, " ") // 压缩空白
    .trim()
    .slice(0, 500); // 限制长度
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

  // 按时间排序（最新的在前）
  allNews.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  console.log(`Collected ${allNews.length} news items from RSS feeds`);
  return allNews;
}
