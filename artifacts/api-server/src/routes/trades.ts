import { db, tradesTable } from "@workspace/db";
import type { Trade } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

function toApiTrade(t: typeof tradesTable.$inferSelect) {
  return {
    id: t.id,
    asset: t.asset,
    timeframe: t.timeframe,
    session: t.session,
    direction: t.direction,
    entry: t.entry ? parseFloat(t.entry) : null,
    stopLoss: t.stopLoss ? parseFloat(t.stopLoss) : null,
    takeProfit: t.takeProfit ? parseFloat(t.takeProfit) : null,
    rr: t.rr ? parseFloat(t.rr) : null,
    lotSize: t.lotSize ? parseFloat(t.lotSize) : null,
    riskPct: t.riskPct ? parseFloat(t.riskPct) : null,
    pnl: t.pnl ? parseFloat(t.pnl) : null,
    holdDuration: t.holdDuration,
    result: t.result,
    htfTrend: t.htfTrend,
    confluences: t.confluences ?? [],
    aiNarrative: t.aiNarrative,
    checklistDirectionAligned: t.checklistDirectionAligned,
    checklistMinConfluences: t.checklistMinConfluences,
    checklistRr: t.checklistRr,
    checklistRisk: t.checklistRisk,
    checklistSlStructure: t.checklistSlStructure,
    checklistCalendar: t.checklistCalendar,
    moodTags: t.moodTags ?? [],
    planAdherence: t.planAdherence,
    didWell: t.didWell,
    toImprove: t.toImprove,
    screenshotUrl: t.screenshotUrl,
    aiAnalyzed: t.aiAnalyzed,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/trades", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "100")), 500);
    const offset = parseInt(String(req.query.offset ?? "0"));
    const resultFilter = req.query.result as string | undefined;

    const where = resultFilter
      ? eq(tradesTable.result, resultFilter as "win" | "loss" | "breakeven")
      : undefined;

    const [trades, totalResult] = await Promise.all([
      db
        .select()
        .from(tradesTable)
        .where(where)
        .orderBy(desc(tradesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(tradesTable).where(where),
    ]);

    res.json({ trades: trades.map(toApiTrade), total: totalResult[0]?.count ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to list trades");
    res.status(500).json({ error: "internal_error", message: "Failed to list trades" });
  }
});

router.get("/trades/stats/summary", async (req, res) => {
  try {
    const allTrades = await db.select().from(tradesTable).orderBy(desc(tradesTable.createdAt));

    const totalTrades = allTrades.length;
    const winCount = allTrades.filter((t) => t.result === "win").length;
    const lossCount = allTrades.filter((t) => t.result === "loss").length;
    const breakevenCount = allTrades.filter((t) => t.result === "breakeven").length;
    const winRate = totalTrades > 0 ? winCount / totalTrades : 0;

    const pnls = allTrades.map((t) => (t.pnl ? parseFloat(t.pnl) : 0));
    const totalPnl = pnls.reduce((a, b) => a + b, 0);

    const rrs = allTrades.filter((t) => t.rr).map((t) => parseFloat(t.rr!));
    const avgRr = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

    const bestTradeValue = pnls.length > 0 ? Math.max(...pnls) : null;
    const worstTradeValue = pnls.length > 0 ? Math.min(...pnls) : null;

    const bestTradeRecord =
      bestTradeValue != null
        ? allTrades.find((t) => t.pnl != null && parseFloat(t.pnl) === bestTradeValue)
        : null;
    const worstTradeRecord =
      worstTradeValue != null
        ? allTrades.find((t) => t.pnl != null && parseFloat(t.pnl) === worstTradeValue)
        : null;

    const bestTradeDetail =
      bestTradeRecord && bestTradeValue != null
        ? { asset: bestTradeRecord.asset, direction: bestTradeRecord.direction, pnl: bestTradeValue }
        : null;
    const worstTradeDetail =
      worstTradeRecord && worstTradeValue != null
        ? { asset: worstTradeRecord.asset, direction: worstTradeRecord.direction, pnl: worstTradeValue }
        : null;

    const grossProfit = pnls.filter((p) => p > 0).reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

    const monthlyMap = new Map<string, { pnl: number; trades: number }>();
    for (const t of allTrades) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) ?? { pnl: 0, trades: 0 };
      existing.pnl += t.pnl ? parseFloat(t.pnl) : 0;
      existing.trades += 1;
      monthlyMap.set(key, existing);
    }

    const monthlyPnl = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({ month, pnl: data.pnl, trades: data.trades }));

    const dailyMap = new Map<string, { pnl: number; trades: number }>();
    for (const t of allTrades) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}-${String(t.createdAt.getDate()).padStart(2, "0")}`;
      const existing = dailyMap.get(key) ?? { pnl: 0, trades: 0 };
      existing.pnl += t.pnl ? parseFloat(t.pnl) : 0;
      existing.trades += 1;
      dailyMap.set(key, existing);
    }

    const dailyPnl = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, pnl: data.pnl, trades: data.trades }));

    const assetMap = new Map<string, { winCount: number; lossCount: number; totalPnl: number; tradeCount: number }>();
    for (const t of allTrades) {
      const key = t.asset;
      const existing = assetMap.get(key) ?? { winCount: 0, lossCount: 0, totalPnl: 0, tradeCount: 0 };
      existing.tradeCount += 1;
      if (t.result === "win") existing.winCount += 1;
      if (t.result === "loss") existing.lossCount += 1;
      existing.totalPnl += t.pnl ? parseFloat(t.pnl) : 0;
      assetMap.set(key, existing);
    }

    const assetBreakdown = Array.from(assetMap.entries())
      .sort((a, b) => b[1].tradeCount - a[1].tradeCount)
      .map(([asset, data]) => ({
        asset,
        tradeCount: data.tradeCount,
        winCount: data.winCount,
        lossCount: data.lossCount,
        winRate: data.tradeCount > 0 ? data.winCount / data.tradeCount : 0,
        totalPnl: data.totalPnl,
      }));

    res.json({
      totalTrades,
      winCount,
      lossCount,
      breakevenCount,
      winRate,
      totalPnl,
      avgRr,
      bestTrade: bestTradeValue,
      worstTrade: worstTradeValue,
      profitFactor,
      bestTradeDetail,
      worstTradeDetail,
      monthlyPnl,
      dailyPnl,
      assetBreakdown,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get trade stats");
    res.status(500).json({ error: "internal_error", message: "Failed to get stats" });
  }
});

router.get("/trades/ai-insight", async (req, res) => {
  try {
    const recentTrades = await db
      .select()
      .from(tradesTable)
      .orderBy(desc(tradesTable.createdAt))
      .limit(20);

    if (recentTrades.length < 3) {
      res.json({ insight: "Log at least 3 trades to receive personalized AI insights." });
      return;
    }

    const totalTrades = recentTrades.length;
    const wins = recentTrades.filter((t) => t.result === "win").length;
    const losses = recentTrades.filter((t) => t.result === "loss").length;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

    const sessionMap = new Map<string, { wins: number; total: number }>();
    const confluenceMap = new Map<string, { wins: number; total: number }>();
    const assetMap = new Map<string, { wins: number; total: number }>();

    for (const t of recentTrades) {
      if (t.session) {
        const s = sessionMap.get(t.session) ?? { wins: 0, total: 0 };
        s.total++;
        if (t.result === "win") s.wins++;
        sessionMap.set(t.session, s);
      }
      for (const c of (t.confluences ?? [])) {
        const cv = confluenceMap.get(c) ?? { wins: 0, total: 0 };
        cv.total++;
        if (t.result === "win") cv.wins++;
        confluenceMap.set(c, cv);
      }
      const a = assetMap.get(t.asset) ?? { wins: 0, total: 0 };
      a.total++;
      if (t.result === "win") a.wins++;
      assetMap.set(t.asset, a);
    }

    const sessionSummary = Array.from(sessionMap.entries())
      .map(([s, v]) => `${s}: ${v.wins}/${v.total} wins`)
      .join(", ");

    const confluenceSummary = Array.from(confluenceMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([c, v]) => `${c}: ${Math.round((v.wins / v.total) * 100)}% win rate (${v.total} trades)`)
      .join(", ");

    const assetSummary = Array.from(assetMap.entries())
      .map(([a, v]) => `${a}: ${v.wins}/${v.total} wins`)
      .join(", ");

    const recentResults = recentTrades
      .slice(0, 10)
      .map((t) => `${t.asset} ${t.direction} ${t.result ?? "pending"} ${t.session ?? ""} planAdherence:${t.planAdherence ?? "N/A"}`)
      .join("\n");

    const prompt = `You are a trading coach analyzing a trader's recent performance. Based on the data below, give ONE specific, actionable insight in 1-2 sentences. Be direct, specific, and motivating. Focus on what pattern stands out most — either a strength to leverage or a weakness to fix.

Recent ${totalTrades} trades — Overall win rate: ${winRate}% (${wins} wins, ${losses} losses)
Sessions: ${sessionSummary || "not tracked"}
Confluences: ${confluenceSummary || "not tracked"}
Assets: ${assetSummary}
Recent trade log:
${recentResults}

Return ONLY the insight text, no labels or explanations. Keep it under 120 characters.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const insight = textBlock && textBlock.type === "text"
      ? textBlock.text.trim()
      : "Keep logging trades to unlock personalized AI insights.";

    res.json({ insight });
  } catch (err) {
    req.log.error({ err }, "Failed to generate AI insight");
    res.status(500).json({ error: "ai_error", message: "Failed to generate insight" });
  }
});

router.get("/trades/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "bad_request", message: "Invalid ID" });
      return;
    }
    const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, id));
    if (!trade) {
      res.status(404).json({ error: "not_found", message: "Trade not found" });
      return;
    }
    res.json(toApiTrade(trade));
  } catch (err) {
    req.log.error({ err }, "Failed to get trade");
    res.status(500).json({ error: "internal_error", message: "Failed to get trade" });
  }
});

router.post("/trades", async (req, res) => {
  try {
    const body = req.body;
    const [trade] = await db
      .insert(tradesTable)
      .values({
        asset: body.asset,
        timeframe: body.timeframe,
        session: body.session ?? null,
        direction: body.direction,
        entry: body.entry != null ? String(body.entry) : null,
        stopLoss: body.stopLoss != null ? String(body.stopLoss) : null,
        takeProfit: body.takeProfit != null ? String(body.takeProfit) : null,
        rr: body.rr != null ? String(body.rr) : null,
        lotSize: body.lotSize != null ? String(body.lotSize) : null,
        riskPct: body.riskPct != null ? String(body.riskPct) : null,
        pnl: body.pnl != null ? String(body.pnl) : null,
        holdDuration: body.holdDuration ?? null,
        result: body.result ?? null,
        htfTrend: body.htfTrend ?? null,
        confluences: body.confluences ?? [],
        aiNarrative: body.aiNarrative ?? null,
        checklistDirectionAligned: body.checklistDirectionAligned ?? null,
        checklistMinConfluences: body.checklistMinConfluences ?? null,
        checklistRr: body.checklistRr ?? null,
        checklistRisk: body.checklistRisk ?? null,
        checklistSlStructure: body.checklistSlStructure ?? null,
        checklistCalendar: body.checklistCalendar ?? null,
        moodTags: body.moodTags ?? [],
        planAdherence: body.planAdherence ?? null,
        didWell: body.didWell ?? null,
        toImprove: body.toImprove ?? null,
        screenshotUrl: body.screenshotUrl ?? null,
        aiAnalyzed: body.aiAnalyzed ?? false,
      })
      .returning();
    res.status(201).json(toApiTrade(trade));
  } catch (err) {
    req.log.error({ err }, "Failed to create trade");
    res.status(500).json({ error: "internal_error", message: "Failed to create trade" });
  }
});

router.patch("/trades/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "bad_request", message: "Invalid ID" });
      return;
    }
    const body = req.body;
    const updateData: Partial<Trade> & { updatedAt: Date } = { updatedAt: new Date() };

    if (body.asset !== undefined) updateData.asset = body.asset;
    if (body.timeframe !== undefined) updateData.timeframe = body.timeframe;
    if (body.session !== undefined) updateData.session = body.session;
    if (body.direction !== undefined) updateData.direction = body.direction;
    if (body.entry !== undefined) updateData.entry = body.entry != null ? String(body.entry) : null;
    if (body.stopLoss !== undefined) updateData.stopLoss = body.stopLoss != null ? String(body.stopLoss) : null;
    if (body.takeProfit !== undefined) updateData.takeProfit = body.takeProfit != null ? String(body.takeProfit) : null;
    if (body.rr !== undefined) updateData.rr = body.rr != null ? String(body.rr) : null;
    if (body.lotSize !== undefined) updateData.lotSize = body.lotSize != null ? String(body.lotSize) : null;
    if (body.riskPct !== undefined) updateData.riskPct = body.riskPct != null ? String(body.riskPct) : null;
    if (body.pnl !== undefined) updateData.pnl = body.pnl != null ? String(body.pnl) : null;
    if (body.holdDuration !== undefined) updateData.holdDuration = body.holdDuration;
    if (body.result !== undefined) updateData.result = body.result;
    if (body.htfTrend !== undefined) updateData.htfTrend = body.htfTrend;
    if (body.confluences !== undefined) updateData.confluences = body.confluences;
    if (body.aiNarrative !== undefined) updateData.aiNarrative = body.aiNarrative;
    if (body.checklistDirectionAligned !== undefined) updateData.checklistDirectionAligned = body.checklistDirectionAligned;
    if (body.checklistMinConfluences !== undefined) updateData.checklistMinConfluences = body.checklistMinConfluences;
    if (body.checklistRr !== undefined) updateData.checklistRr = body.checklistRr;
    if (body.checklistRisk !== undefined) updateData.checklistRisk = body.checklistRisk;
    if (body.checklistSlStructure !== undefined) updateData.checklistSlStructure = body.checklistSlStructure;
    if (body.checklistCalendar !== undefined) updateData.checklistCalendar = body.checklistCalendar;
    if (body.moodTags !== undefined) updateData.moodTags = body.moodTags;
    if (body.planAdherence !== undefined) updateData.planAdherence = body.planAdherence;
    if (body.didWell !== undefined) updateData.didWell = body.didWell;
    if (body.toImprove !== undefined) updateData.toImprove = body.toImprove;
    if (body.screenshotUrl !== undefined) updateData.screenshotUrl = body.screenshotUrl;
    if (body.aiAnalyzed !== undefined) updateData.aiAnalyzed = body.aiAnalyzed;

    const [updated] = await db
      .update(tradesTable)
      .set(updateData)
      .where(eq(tradesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Trade not found" });
      return;
    }
    res.json(toApiTrade(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update trade");
    res.status(500).json({ error: "internal_error", message: "Failed to update trade" });
  }
});

router.delete("/trades/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "bad_request", message: "Invalid ID" });
      return;
    }
    const [deleted] = await db
      .delete(tradesTable)
      .where(eq(tradesTable.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "not_found", message: "Trade not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete trade");
    res.status(500).json({ error: "internal_error", message: "Failed to delete trade" });
  }
});

router.post("/trades/analyze", async (req, res) => {
  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64 || !mediaType) {
      res.status(400).json({ error: "bad_request", message: "imageBase64 and mediaType are required" });
      return;
    }

    const prompt = `You are analyzing a trading chart screenshot to extract trade setup information.

CRITICAL RULES for TradingView position markers:
- Position markers appear as TWO vertically stacked rectangles
- Top rectangle = Stop Loss zone
- Bottom rectangle = Take Profit zone  
- The boundary between the two rectangles = Entry price
- Identification must be based on POSITION (vertical layout), NOT color

Direction Logic:
- SHORT: Entry is at top portion, SL is above entry, TP is below entry
- LONG: Entry is at bottom portion, SL is below entry, TP is above entry

Do NOT confuse position markers with Supply/Demand zones — those are wider, horizontal bands usually labeled.

Extract the following information from the chart and return ONLY valid JSON with no markdown or explanation:
{
  "asset": "the trading pair or asset symbol (e.g. XAUUSD, EURUSD, BTC/USD)",
  "timeframe": "chart timeframe (M1, M5, M15, M30, H1, H4, D1, W1)",
  "session": "trading session if identifiable (Asian, London, New York, London+NY) or null",
  "direction": "long or short (null if cannot determine)",
  "entry": entry price as number or null,
  "stopLoss": stop loss price as number or null,
  "takeProfit": take profit price as number or null,
  "htfTrend": "higher timeframe trend direction (Bullish, Bearish, or null if not shown)",
  "narrative": "2-3 sentence description of the trade setup visible in the chart"
}

Return ONLY the JSON object, no other text.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      res.status(500).json({ error: "ai_error", message: "No text response from AI" });
      return;
    }

    const jsonText = textBlock.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const analysis = JSON.parse(jsonText);

    res.json({
      asset: analysis.asset ?? null,
      timeframe: analysis.timeframe ?? null,
      session: analysis.session ?? null,
      direction: analysis.direction ?? null,
      entry: analysis.entry ?? null,
      stopLoss: analysis.stopLoss ?? null,
      takeProfit: analysis.takeProfit ?? null,
      htfTrend: analysis.htfTrend ?? null,
      narrative: analysis.narrative ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze trade");
    res.status(500).json({ error: "ai_error", message: "Failed to analyze chart screenshot" });
  }
});

export default router;
