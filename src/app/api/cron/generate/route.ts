import { NextRequest, NextResponse } from "next/server";
import { collectNews } from "@/lib/sources";
import { generateNewsletter } from "@/lib/ai";
import { renderEmailHTML } from "@/lib/template";
import { sendNewsletter } from "@/lib/email";

export const maxDuration = 60; // Vercel Pro 最多 60s
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 验证 Cron Secret (Vercel Cron 会自动带上这个 header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("🚀 Starting newsletter generation...");

    // Step 1: 采集新闻
    console.log("📡 Collecting news from RSS feeds...");
    const news = await collectNews();

    if (news.length === 0) {
      console.log("⚠️ No news collected, skipping generation");
      return NextResponse.json({
        success: false,
        message: "No news collected",
      });
    }

    console.log(`✅ Collected ${news.length} news items`);

    // Step 2: AI 生成日报
    console.log("🤖 Generating newsletter with AI...");
    const newsletter = await generateNewsletter(news);
    console.log("✅ Newsletter generated");

    // Step 3: 渲染 HTML 邮件
    console.log("🎨 Rendering email template...");
    const html = renderEmailHTML(newsletter);

    // Step 4: 发送邮件
    console.log("📧 Sending email...");
    const result = await sendNewsletter(html, newsletter.date);

    if (result.success) {
      console.log("✅ Newsletter sent successfully!");
      return NextResponse.json({
        success: true,
        date: newsletter.date,
        newsCount: news.length,
        highlights: newsletter.highlights.length,
      });
    } else {
      console.error("❌ Failed to send:", result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Newsletter generation failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
