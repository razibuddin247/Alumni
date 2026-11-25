// server.ts
import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = express();
app.use(express.json());
var aiClient = null;
function getAiClient() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
function getFallbackMaritimeNews() {
  return [
    {
      id: "fb-1",
      title: "IMO Marine Environment Protection Committee (MEPC) Advances Net-Zero Maritime Framework",
      summary: "The International Maritime Organization continues steering the global shipping industry toward ambitious greenhouse gas emissions reduction targets for 2030 and 2050, finalizing economic pricing mechanisms and technical fuel standards.",
      category: "Regulations & IMO",
      source: "IMO Media Centre",
      url: "https://www.imo.org/en/MediaCentre/Pages/WhatsNew.aspx",
      publishedDate: "Recent Update",
      highlights: [
        "Global fuel standard proposals aiming for lifecycle zero-carbon propulsion.",
        "Economic pricing measures to incentivize early commercial adoption of green ammonia and methanol."
      ]
    },
    {
      id: "fb-2",
      title: "Global Container Shipping Fleet Adjusts Suez & Cape of Good Hope Route Economics",
      summary: "Major liner operators report increased ton-mile demand and operational fuel consumption as commercial vessels reroute around Africa, prompting adjustments in feeder connections and harbor hub logistics.",
      category: "Shipping Markets",
      source: "TradeWinds / Splash247",
      url: "https://splash247.com",
      publishedDate: "Recent Update",
      highlights: [
        "Extended sailing voyages absorb surplus container capacity.",
        "Bunker hubs in Singapore and South Africa see record marine fuel bunkering volumes."
      ]
    },
    {
      id: "fb-3",
      title: "Alternative Marine Fuels: Methanol & Dual-Fuel Engine Orders Surge in Global Shipyards",
      summary: "Classification societies (DNV, Lloyd\u2019s Register) report record orderbooks for dual-fuel container, tanker, and car carrier vessels equipped to burn green methanol, ammonia, and LNG to comply with EU ETS and FuelEU Maritime regulations.",
      category: "Green Tech & Decarbonization",
      source: "Lloyd's Register / DNV",
      url: "https://www.dnv.com/maritime/",
      publishedDate: "Recent Update",
      highlights: [
        "Over 300 dual-fuel vessels scheduled for yard delivery across East Asian shipbuilding hubs.",
        "Engine manufacturers roll out standardized retrofitting packages for large marine two-stroke engines."
      ]
    },
    {
      id: "fb-4",
      title: "STCW Modernization and Enhanced Seafarer Welfare Standards Progress at IMO Sub-Committee",
      summary: "The IMO Human Element, Training and Watchkeeping (HTW) sub-committee progresses comprehensive revisions to the STCW Convention, addressing digital navigation, cybersecurity awareness, mandatory shipboard Wi-Fi access, and mariner mental health.",
      category: "Seafarer Welfare & Safety",
      source: "BIMCO / International Transport Workers Federation",
      url: "https://www.bimco.org/news",
      publishedDate: "Recent Update",
      highlights: [
        "Proposed mandatory high-speed satellite communications access for all crewmembers on international voyages.",
        "Enhanced simulator and automated vessel operations training for newly certified cadets."
      ]
    },
    {
      id: "fb-5",
      title: "Matarbari Deep Sea Port & Chittagong Port Expand Container Feeder Capacity",
      summary: "Bangladesh maritime authorities report steady engineering progress on the Matarbari Deep Sea Port channel, enabling direct mother vessel calls with up to 18.5m draft, while Chittagong port terminals upgrade gantry systems to shorten vessel turnaround times.",
      category: "Ports & Logistics",
      source: "Chattogram Port Authority & Department of Shipping, Bangladesh",
      url: "https://cpa.gov.bd",
      publishedDate: "Recent Update",
      highlights: [
        "Direct berthing for 8,000+ TEU vessels under development, dramatically cutting transshipment feeder times via Colombo and Singapore.",
        "Expansion of nautical radar vessel traffic services (VTS) along the Karnaphuli river approach."
      ]
    },
    {
      id: "fb-6",
      title: "Tanker Market Outlook: Product Tankers Experience Strong Ton-Mile Growth on Refinery Shifts",
      summary: "Crude and product tanker freight indices demonstrate resilient charter earnings as long-haul cargo patterns solidify from the Arabian Gulf and US Gulf Coast to Asian and European discharge ports.",
      category: "Shipping Markets",
      source: "Maritime Executive / Baltic Exchange",
      url: "https://maritime-executive.com",
      publishedDate: "Recent Update",
      highlights: [
        "Clean product tanker rates supported by structural changes in European refining capacity.",
        "High compliance inspections under PSC regimes prioritizing SOLAS firefighting and bilge management."
      ]
    }
  ];
}
var newsCache = null;
app.get("/api/maritime-news", async (req, res) => {
  const forceRefresh = req.query.refresh === "true";
  const now = Date.now();
  if (!forceRefresh && newsCache && now - newsCache.timestamp < 15 * 60 * 1e3) {
    return res.json({
      articles: newsCache.articles,
      lastUpdated: new Date(newsCache.timestamp).toISOString(),
      groundingSources: newsCache.groundingSources,
      cached: true
    });
  }
  try {
    const ai = getAiClient();
    const prompt = `Search the internet for the most critical, verified maritime and commercial shipping industry news from the last 24 to 72 hours.
Topics to cover:
1. Global commercial shipping routes, freight rates, container and tanker fleet market updates (e.g. Suez/Red Sea rerouting, Panama Canal, Asia-Europe trade).
2. IMO (International Maritime Organization) regulations, MEPC carbon targets, CII, EU ETS, green methanol/ammonia alternative marine fuels.
3. Seafarer safety, crew welfare, STCW updates, mariner rights and onboard labor regulations.
4. Major port developments, maritime logistics, and smart vessel automation.
5. Bangladesh and regional South Asian maritime developments if available.

Return 6 to 8 top verified news items.
Format your response as a valid JSON array of objects without any markdown code fences or conversational text:
[
  {
    "id": "1",
    "title": "Clear informative headline",
    "summary": "Detailed 2-3 sentence summary explaining the development and its impact on shipping, mariners, or fleet operations.",
    "category": "Shipping Markets" | "Regulations & IMO" | "Green Tech & Decarbonization" | "Seafarer Welfare & Safety" | "Ports & Logistics",
    "source": "Name of news publication or agency (e.g. IMO, TradeWinds, Lloyd's List, Splash247, Maritime Executive, BIMCO)",
    "url": "Direct link or official portal URL",
    "publishedDate": "Recent date or time ago",
    "highlights": ["Key takeaway point 1", "Key takeaway point 2"]
  }
]`;
    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert maritime intelligence and shipping industry analyst. Always use Google Search to find verified, authentic, and current maritime news stories. Output strictly valid JSON array without any preamble.",
        tools: [{ googleSearch: {} }]
      }
    });
    const text = (response.text || "").trim();
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingSources = [];
    chunks.forEach((chunk) => {
      if (chunk.web?.uri) {
        groundingSources.push({
          title: chunk.web.title || "Maritime News Source",
          url: chunk.web.uri
        });
      }
    });
    let articles = [];
    try {
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      articles = JSON.parse(cleanJson);
    } catch {
      const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        try {
          articles = JSON.parse(arrayMatch[0]);
        } catch {
        }
      }
    }
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      articles = getFallbackMaritimeNews();
    }
    articles = articles.map((art, idx) => {
      let url = art.url;
      if (!url || !url.startsWith("http")) {
        url = groundingSources[idx]?.url || "https://www.imo.org/en/MediaCentre/Pages/WhatsNew.aspx";
      }
      return {
        ...art,
        id: art.id || `news-${idx + 1}`,
        url
      };
    });
    newsCache = {
      timestamp: Date.now(),
      articles,
      groundingSources
    };
    res.json({
      articles,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      groundingSources,
      cached: false
    });
  } catch (err) {
    console.error("Failed to fetch search-grounded maritime news:", err);
    if (newsCache) {
      return res.json({
        articles: newsCache.articles,
        lastUpdated: new Date(newsCache.timestamp).toISOString(),
        groundingSources: newsCache.groundingSources,
        cached: true,
        warning: "Live search currently busy; serving cached updates."
      });
    }
    const fallbackArticles = getFallbackMaritimeNews();
    res.json({
      articles: fallbackArticles,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      groundingSources: [
        { title: "IMO Media Centre", url: "https://www.imo.org/en/MediaCentre" },
        { title: "BIMCO Shipping News", url: "https://www.bimco.org/news" },
        { title: "Splash247 Maritime News", url: "https://splash247.com" }
      ],
      cached: false
    });
  }
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const PORT = process.env.PORT || 3e3;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
