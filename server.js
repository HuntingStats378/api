const express = require("express");
const axios = require("axios");
const cors = require("cors");
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const app = express();
app.use(cors());
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { google } = require("googleapis");
const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");

// Prevent crashes on unhandled errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// === Discord Bot Setup ===
const bot = new Client({ intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.Guilds], partials: ['CHANNEL'] });
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
let latestSzaSzabiUpload = null;
let overriddenUser2 = null; // Store override in memory
const ARCANE_API_KEY = process.env.ARCANE_API_KEY;
const LURKR_API_KEY = process.env.LURKR_API_KEY;
const HEADERS = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,pt;q=0.7",
  "authorization": ARCANE_API_KEY,
  "if-none-match": "W/\"de3e-F4Q3Pl3thCt0unfPKV0M1Jnj69Y\"",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-user-agent": "Arcane-Bot-5.0"
};

// Load and parse NDJSON file at startup
const CHANNEL_BIRTHDAY_ID = process.env.BIRTHDAY_CHANNEL_ID; // Discord channel for notificationslet lastSentChannel = null; // Store the last sent channel to continue sequentially

// Set the birthday target: 20 years + 150 days ago
const BIRTHDAY_YEARS = 20;
const BIRTHDAY_DAYS = 150;

// Load NDJSON channels
const channels = fs.readFileSync("./channels.ndjson", "utf-8")
  .split("\n")
  .filter(Boolean)
  .map(line => JSON.parse(line));

wss.on("connection", async (ws, req) => {
  if (ws.path === "upload") {
    console.log("New WebSocket connection established");

    ws.on("message", (message) => {
      console.log("Received message:", message);
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    if (latestSzaSzabiUpload) {
      ws.send(JSON.stringify(latestSzaSzabiUpload));
    }

  } else if (ws.path === "second") {
    console.log("🔗 Render client connected");

    let lastSecond = null;
    const interval = setInterval(() => {
      const now = new Date();
      const currentSecond = now.getUTCSeconds();

      if (currentSecond !== lastSecond) {
        lastSecond = currentSecond;
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: "renderTime",
            utc: now.toISOString()
          }));
        }
      }
    }, 50);

    ws.on("close", () => {
      clearInterval(interval);
      console.log("❌ Render client disconnected");
    });

  } else if (ws.path === "ipad") {
    const ip = req.socket.remoteAddress;
    console.log(`Client connected from ${ip}`);

    try {
      const user = await bot.users.fetch(OWNER_ID);
      await user.send(`📶 WebSocket connection established from ${ip}`);
    } catch (err) {
      console.error("Failed to send DM:", err);
    }

    ws.on("close", async () => {
      console.log(`Client disconnected from ${ip}`);
      try {
        const user = await bot.users.fetch(OWNER_ID);
        await user.send(`❌ WebSocket connection closed from ${ip}`);
      } catch (err) {
        console.error("Failed to send DM:", err);
      }
    });
  }
});

bot.login(BOT_TOKEN);

function padZero(number) {
  return String(number).padStart(2, '0');
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

function getGoal(count2) {
  var count = parseFloat(count2);
  var t = parseFloat(count2);
  if (count == null) return 0;
  if (10 > t) return 10 - t;
  var e = "" + t;
  return Math.abs(
    t -
    (e.length > 6
      ? 1e6 * (Math.floor(t / 1e6) + 1)
      : (parseInt(e.charAt(0)) + 1) * Math.pow(10, e.length - 1))
  );
}

function getGoalText(count2) {
  var count = parseFloat(count2);
  var t = parseFloat(count2);
  if (count == null) return 0;
  if (10 > t) return 10;
  var e = "" + t;
  return e.length > 6
    ? 1e6 * (Math.floor(t / 1e6) + 1)
    : (parseInt(e.charAt(0)) + 1) * Math.pow(10, e.length - 1);
}

function abbreviateNumber(num) {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '') + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2).replace(/\.?0+$/, '') + 'K';
  } else {
    return num.toString();
  }
}

async function getArcaneTop100Leaderboard(server, pageCount = 1, limit = 100) {
  const base = `https://arcane.bot/api/guilds/${server}/levels/leaderboard`;
  const requests = [];

  for (let i = 0; i < pageCount; i++) {
    requests.push(fetch(`${base}?limit=${limit}&page=${i}`, { headers: HEADERS }));
  }

  const responses = await Promise.all(requests);
  const jsonData = await Promise.all(responses.map(res => res.json()));

  const levels = [];
  let xpOptions = null;

  for (const data of jsonData) {
    if (Array.isArray(data.levels)) {
      levels.push(...data.levels);
    }
    if (!xpOptions && data.xp_options) {
      xpOptions = data.xp_options;
    }
  }

  return {
    levels,
    xpOptions
  };
}

async function fetchLatestSzaSzabiUpload(YOUTUBE_API_KEY, wss) {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=UCx2ey9QUf1Ja4sV3EdavwSg&part=snippet&order=date&type=video&maxResults=1`
    );

    if (response.data.items.length > 0) {
      const latestSzaSzabiUpload = response.data.items[0];

      // Broadcast ONLY to clients on the "upload" path
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.path === "upload") {
          client.send(JSON.stringify(latestSzaSzabiUpload));
        }
      });

      return latestSzaSzabiUpload;
    }
  } catch (error) {
    console.error("Error fetching latest upload:", error.message);
  }
}

async function fetchyoutubechannel(channelId) {
  try {
    // Fetch from Mixerno API
    const data = await fetch(
      `https://ests.sctools.org/api/get/${channelId}`
    );
    const response = await data.json();

    // Default values for nextcounts
    let studioData = null;
    let nextcountsOK = false;

    try {
      // Attempt fetch from nextcounts
      const dat2a = await fetch(
        `https://api-v2.nextcounts.com/api/youtube/channel/${channelId}`
      );
      const respons2e = await dat2a.json();

      if (respons2e.verifiedSubCount === true) {
        studioData = respons2e.subcount;
        nextcountsOK = true;
      }
    } catch (e) {
      console.warn("nextcounts API failed:", e);
    }

    const subCount = response.stats.estCount;
    const totalViews = response.stats.viewCount;
    const apiViews = response.stats.viewCount;
    const apiSubCount = response.stats.apiCount;
    const videos = response.stats.videoCount;
    const channelLogo = response.info.avatar;
    const channelName = response.info.name;
    const channelBanner = `https://banner.yt/${channelId}`;
    const goalCount = getGoal(subCount);

    // Special case for MrBeast fallback
    if (!nextcountsOK && channelId === "UCX6OQ3DkcsbYNE6H8uQQuVA") {
      try {
        const dat3a = await fetch(`https://mrbeast.subscribercount.app/data`);
        const mrbeast = await dat3a.json();
        studioData = mrbeast.mrbeast;
      } catch (e) {
        console.warn("MrBeast fallback fetch failed:", e);
      }
    }

    // Return object with or without studio data
    const result = {
      t: new Date(),
      counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos],
      user: [channelName, channelLogo, channelBanner, channelId, channelId],
      value: [
        ["Subscribers", "Subscribers (EST)"],
        ["Goal", `Subscribers to ${abbreviateNumber(getGoalText(subCount))}`],
        ["Subscribers", "Subscribers (API)"],
        ["Views", "Views (EST)"],
        ["Views", "Views (API)"],
        ["Videos", "Videos (API)"]
      ]
    };

    if (studioData !== null) {
      result.studio = studioData;
    }

    return result;

  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch counts");
  }
}

async function fetchyoutubevideo(videoId) {
  try {
    const [data, dat2a, dat3a] = await Promise.all([
      fetch(`https://mixerno.space/api/youtube-video-counter/user/${videoId}`),
      fetch(`https://mixerno.space/api/youtube-stream-counter/user/${videoId}`),
      fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`)
    ]);

    const response = await data.json();
    const respons2e = await dat2a.json();
    const respons3e = await dat3a.json();
    const subCount = response.counts[0].count;
    const totalViews = response.counts[3].count;
    const apiViews = respons3e.dislikes;
    const apiSubCount = response.counts[2].count;
    const videos = response.counts[5].count;
    const channelLogo = response.user[1].count;
    const channelName = response.user[0].count;
    const channelBanner = response.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner, videoId, dat3a.dateCreated] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchyoutubestream(videoId) {
  try {
    const [data, dat2a, dat3a] = await Promise.all([
      fetch(`https://mixerno.space/api/youtube-video-counter/user/${videoId}`),
      fetch(`https://mixerno.space/api/youtube-stream-counter/user/${videoId}`),
      fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`)
    ]);

    const response = await data.json();
    const respons2e = await dat2a.json();
    const respons3e = await dat3a.json();
    const liveCount = respons2e.counts[0].count;
    const subCount = response.counts[0].count;
    const totalViews = response.counts[3].count;
    const apiViews = respons3e.dislikes;
    const apiSubCount = response.counts[2].count;
    const videos = response.counts[5].count;
    const channelLogo = response.user[1].count;
    const channelName = response.user[0].count;
    const channelBanner = response.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [liveCount, goalCount, subCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner, videoId, dat3a.dateCreated] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchyoutubelatest(channelId) {
  try {
    const latestdata = await fetch(`https://latestvid.stats100.xyz/get/${channelId}?type=any&maxresults=1`);
    const latestresponse = await latestdata.json();
    const [data, dat2a, dat3a] = await Promise.all([
      fetch(`https://mixerno.space/api/youtube-video-counter/user/${latestresponse[0].videoId}`),
      fetch(`https://mixerno.space/api/youtube-stream-counter/user/${latestresponse[0].videoId}`),
      fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${latestresponse[0].videoId}`)
    ]);

    const response = await data.json();
    const respons2e = await dat2a.json();
    const respons3e = await dat3a.json();
    const subCount = response.counts[0].count;
    const totalViews = response.counts[3].count;
    const apiViews = respons3e.dislikes;
    const apiSubCount = response.counts[2].count;
    const videos = response.counts[5].count;
    const channelLogo = response.user[1].count;
    const channelName = response.user[0].count;
    const channelBanner = response.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner, latestresponse[0].videoId, dat3a.dateCreated] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchyoutubelatestlong(channelId) {
  try {
    const latestdata = await fetch(`https://latestvid.stats100.xyz/get/${channelId}?type=long&maxresults=1`);
    const latestresponse = await latestdata.json();
    const [data, dat2a, dat3a] = await Promise.all([
      fetch(`https://mixerno.space/api/youtube-video-counter/user/${latestresponse[0].videoId}`),
      fetch(`https://mixerno.space/api/youtube-stream-counter/user/${latestresponse[0].videoId}`),
      fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${latestresponse[0].videoId}`)
    ]);

    const response = await data.json();
    const respons2e = await dat2a.json();
    const respons3e = await dat3a.json();
    const subCount = response.counts[0].count;
    const totalViews = response.counts[3].count;
    const apiViews = respons3e.dislikes;
    const apiSubCount = response.counts[2].count;
    const videos = response.counts[5].count;
    const channelLogo = response.user[1].count;
    const channelName = response.user[0].count;
    const channelBanner = response.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner, latestresponse[0].videoId, dat3a.dateCreated] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchyoutubelatestshort(channelId) {
  try {
    const latestdata = await fetch(`https://latestvid.stats100.xyz/get/${channelId}?type=short&maxresults=1`);
    const latestresponse = await latestdata.json();
    const [data, dat2a, dat3a] = await Promise.all([
      fetch(`https://mixerno.space/api/youtube-video-counter/user/${latestresponse[0].videoId}`),
      fetch(`https://mixerno.space/api/youtube-stream-counter/user/${latestresponse[0].videoId}`),
      fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${latestresponse[0].videoId}`)
    ]);

    const response = await data.json();
    const respons2e = await dat2a.json();
    const respons3e = await dat3a.json();
    const subCount = response.counts[0].count;
    const totalViews = response.counts[3].count;
    const apiViews = respons3e.dislikes;
    const apiSubCount = response.counts[2].count;
    const videos = response.counts[5].count;
    const channelLogo = response.user[1].count;
    const channelName = response.user[0].count;
    const channelBanner = response.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner, latestresponse[0].videoId, dat3a.dateCreated] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchyoutubelatestlive(channelId) {
  try {
    const latestdata = await fetch(`https://latestvid.stats100.xyz/get/${channelId}?type=live&maxresults=1`);
    const latestresponse = await latestdata.json();
    const [data, dat2a, dat3a] = await Promise.all([
      fetch(`https://mixerno.space/api/youtube-video-counter/user/${latestresponse[0].videoId}`),
      fetch(`https://mixerno.space/api/youtube-stream-counter/user/${latestresponse[0].videoId}`),
      fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${latestresponse[0].videoId}`)
    ]);

    const response = await data.json();
    const respons2e = await dat2a.json();
    const respons3e = await dat3a.json();
    const liveCount = respons2e.counts[0].count;
    const subCount = response.counts[0].count;
    const totalViews = response.counts[3].count;
    const apiViews = respons3e.dislikes;
    const apiSubCount = response.counts[2].count;
    const videos = response.counts[5].count;
    const channelLogo = response.user[1].count;
    const channelName = response.user[0].count;
    const channelBanner = response.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [liveCount, goalCount, subCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner, latestresponse[0].videoId, dat3a.dateCreated] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchinstagramuser(userId) {
  try {
    const [data, dat2a] = await Promise.all([
      fetch(`https://livecounts.xyz/api/instagram-live-follower-count/live/${userId}`),
      fetch(`https://api-v2.nextcounts.com/api/instagram/user/${userId}`)
    ]);

    const response = await data.json();
    const response2 = await dat2a.json();
    const subCount = response.counts[0];
    const totalViews = response.counts[2];
    const apiSubCount = response.counts[1];
    const channelLogo = response2.avatar || null;
    const channelName = response2.nickname || null;
    const channelBanner = response2.userBanner || null;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews], user: [channelName, channelLogo, channelBanner, userId, userId] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchtiktokuser(userId) {
  try {
    const data = await fetch(`https://mixerno.space/api/tiktok-user-counter/user/${userId}`);

    const response = await data.json();
    const subCount = response.counts[0].count;
    const totalViews = response.counts[4].count;
    const apiViews = response.counts[3].count;
    const apiSubCount = response.counts[2].count;
    const channelLogo = response.user[1].count;
    const channelName = response.user[0].count;
    const channelBanner = response.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews], user: [channelName, channelLogo, channelBanner, userId, userId] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchtwitteruser(userId) {
  try {
    const data = await fetch(`https://mixerno.space/api/twitter-user-counter/user/${userId}`);

    const response = await data.json();
    const subCount = response.counts[0].count;
    const totalViews = response.counts[3].count;
    const apiViews = response.counts[4].count;
    const apiSubCount = response.counts[2].count;
    const videos = response.counts[5].count;
    const extra = response.counts[6].count;
    const channelLogo = response.user[1].count;
    const channelName = response.user[0].count;
    const channelBanner = response.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos, extra], user: [channelName, channelLogo, channelBanner, userId, userId] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetch50statesfundraiser(userId) {
  if (userId === "top") {
    try {
      const data = await fetch(`https://mixerno.space/api/twitter-user-counter/user/${userId}`);
      const response = await data.json();

      const subCount = response.counts[0].count;
      const totalViews = response.counts[3].count;
      const apiViews = response.counts[4].count;
      const apiSubCount = response.counts[2].count;
      const videos = response.counts[5].count;
      const extra = response.counts[6].count;
      const channelLogo = response.user[1].count;
      const channelName = response.user[0].count;
      const channelBanner = response.user[2].count;
      const goalCount = getGoal(subCount);

      return {
        t: new Date(),
        counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos, extra],
        user: [channelName, channelLogo, channelBanner, userId, userId],
      };
    } catch (error) {
      console.error(error);
      return { error: "Failed to fetch counts" };
    }
  } else {
    try {
      const data = await fetch(`https://corsproxy.io/?https://gshso0nx9d.execute-api.us-east-1.amazonaws.com/api/public/campaigns/13135e7f-7d66-422e-ac00-0197067d5c8a`);
      const response = await data.json();

      const subCount = response.data.amount_raised.value;
      const totalViews = response.data.goal.value;
      const apiViews = response.data.original_goal.value;
      const channelLogo = response.data.avatar.src;
      const channelName = response.data.name;
      const channelBanner = response.data.id;
      const goalCount = getGoal(subCount);

      return {
        t: new Date(),
        counts: [subCount, goalCount, totalViews, apiViews],
        user: [channelName, channelLogo, channelBanner, userId, userId],
      };
    } catch (error) {
      console.error(error);
      return { error: "Failed to fetch counts" };
    }
  }
}

async function fetchlurkrlevels(serverId, page) {
  try {
    const response = await fetch(`https://api.lurkr.gg/v2/levels/${serverId}?page=${page}`, {
      headers: { "X-API-Key": LURKR_API_KEY }
    });

    if (!response.ok) {
      throw new Error(`Lurkr API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

const GUILD_ID = "1150096734576451614";
const API_BASE = `https://api.lurkr.gg/v2/levels/${GUILD_ID}`;

app.get("/lurkr-combined", async (req, res) => {
  try {
    let page = 1;
    let allLevels = [];
    let guildData = null;

    while (true) {
      const response = await fetch(`${API_BASE}?page=${page}`);
      if (!response.ok) throw new Error(`Failed to fetch page ${page}`);
      const data = await response.json();

      if (!guildData) {
        // Keep guild and metadata from first page
        guildData = {
          guild: data.guild,
          isManager: data.isManager,
          multipliers: data.multipliers,
          roleRewards: data.roleRewards,
          vanity: data.vanity,
          xpGainInterval: data.xpGainInterval,
          xpPerMessageMax: data.xpPerMessageMax,
          xpPerMessageMin: data.xpPerMessageMin
        };
      }

      allLevels.push(...data.levels);

      if (data.levels.length < 100) break;
      page++;
    }

    // Return the combined object exactly in the Lurkr format
    res.json({
      ...guildData,
      levels: allLevels
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/youtube/channel/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await fetchyoutubechannel(id));
});

app.get("/api/youtube/video/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await fetchyoutubevideo(id));
});

app.get("/api/youtube/stream/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await fetchyoutubestream(id));
});

app.get("/api/instagram/user/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await fetchinstagramuser(id));
});

app.get("/api/tiktok/user/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await fetchtiktokuser(id));
});

app.get("/api/twitter/user/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await fetchtwitteruser(id));
});

app.get("/api/lurkr/levels/:id/:page", async (req, res) => {
  const { id, page } = req.params;
  const pageNumber = parseInt(page);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return res.status(400).json({ error: "Invalid page number" });
  }

  const result = await fetchlurkrlevels(id, pageNumber);
  res.json(result);
});

// API route to get YouTube live subscriber count
app.get("/api/chat/youtube/channel/:channelId", async (req, res) => {
  try {
    // Search for channel information
    const searchResponse = await axios.get(
      `https://mixerno.space/api/youtube-channel-counter/search/${req.params.channelId}`
    );
    const channelId = searchResponse.data.list[0][2];

    // Fetch detailed channel data
    const response = await axios.get(
      `https://mixerno.space/api/youtube-channel-counter/user/${channelId}`
    );
    const subCount = response.data.counts[0].count;
    const channelName = response.data.user[0].count;
    const time = new Date(new Date(response.data.t).getTime()).toISOString();

    res.send(`${channelName} has got estimated ${numberWithCommas(subCount)} subscribers! (${time})`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to fetch counts");
  }
});

// API route for studio data
app.get("/api/chat/youtube/channel/:channelId/studio", async (req, res) => {
  try {
    // Search for channel information
    const searchResponse = await axios.get(
      `https://mixerno.space/api/youtube-channel-counter/search/${req.params.channelId}`
    );
    const channelId = searchResponse.data.list[0][2];

    // Fetch detailed studio data
    const studioResponse = await axios.get(
      `https://cors.stats100.xyz/https://studio.nia-statistics.com/api/channel/${channelId}`
    );
    const response = await axios.get(
      `https://mixerno.space/api/youtube-channel-counter/user/${channelId}`
    );

    const subCount = studioResponse.data.channels.counts[2].count;
    const channelName = response.data.user[0].count;
    const time = new Date(new Date(response.data.t).getTime()).toISOString();

    res.send(`${channelName} has got exactly ${numberWithCommas(subCount)} subscribers! (${time})`);
  } catch (error) {
    console.error(error);
    res.status(200).send("Not in studio.");
  }
});

app.get("/api/chat/countdown/:offset", async (req, res) => {
  try {
    const currentDate = new Date();
    let offsetStr = req.params.offset; // Full timezone string like "UTC+05:30" or "UTC-03:00"
    let sign = offsetStr.charAt(3) === '-' ? -1 : 1; // Determine if it's positive or negative offset
    let offsetParts = offsetStr.slice(4).split(":"); // Get the hour and minute parts
    let offsetHours = parseInt(offsetParts[0]) || 0; // Default to 0 if not provided
    let offsetMinutes = parseInt(offsetParts[1]) || 0; // Default to 0 if not provided
    let totalOffsetMinutes = sign * (offsetHours * 60 + offsetMinutes); // Convert to total minutes
    let targetDate = new Date("2026-01-01T00:00:00Z"); // Set target date to Jan 1, 2026 in UTC
    targetDate.setMinutes(targetDate.getMinutes() - totalOffsetMinutes); // Adjust the target date by the offset in minutes
    let timeDiff = targetDate - currentDate;
    let daysUntil2025 = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    let hoursUntil2025 = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutesUntil2025 = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    let secondsUntil2025 = Math.floor((timeDiff % (1000 * 60)) / 1000);
    res.send(`The time until 2026 for ${offsetStr} is ${padZero(daysUntil2025)}:${padZero(hoursUntil2025)}:${padZero(minutesUntil2025)}:${padZero(secondsUntil2025)}!`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to fetch counts");
  }
});

// API route to get YouTube live subscriber count
app.get("/api/chat/minecraft/xbox/:channelId/:username", async (req, res) => {
  try {
    // Fetch from Mixerno API
    const data = await fetchyoutubechannel(req.params.channelId);
    const user = await bot.users.fetch(OWNER_ID);
    user.send(`${data.user[0]}'s xbox username is ⬇️`);
    user.send(`${req.params.username}`);
    res.send(`@${data.user[0]}, Your xbox username "${req.params.username}" has been sent.`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to fetch counts");
  }
});

// POST /api/streams/mrbeastrise — set override for user2
app.post("/api/streams/mrbeastrise", (req, res) => {
  const { user2 } = req.body;

  if (!user2) {
    return res.status(400).json({ error: "Missing user2 in body" });
  }

  overriddenUser2 = user2;
  console.log(`✅ user2 overridden: ${user2}`);
  res.status(200).json({ message: `user2 updated to ${user2}` });
});

// GET /api/streams/mrbeastrise — fetch actual data
app.get("/api/streams/mrbeastrise", async (req, res) => {
  try {
    const { data: ids } = await axios.get(
      `https://huntingstats378.github.io/streams/mrbeastrise/ids.json`
    );

    if (!ids.user1 || (!ids.user2 && !overriddenUser2)) {
      return res.status(400).json({ error: "Missing user IDs" });
    }

    const user1 = await fetchyoutubechannel(ids.user1);
    const user2Id = overriddenUser2 || ids.user2;

    const data = await fetch(
      `https://livecounts.xyz/api/instagram-live-follower-count/live/${user2Id}`
    );
    const user2 = await data.json();

    const user1Count = user1.counts[0];
    const user2Followers = user2.counts[0];
    const user2Following = user2.counts[1];
    const user2Posts = user2.counts[2];

    const gap = Math.abs(user2Followers - user1Count);

    res.json({
      t: new Date(),
      gap: gap,
      counts: [
        [ids.platform1, ids.user1, user1Count, user1.counts[3], user1.counts[5]],
        [ids.platform2, user2Id, user2Followers, user2Following, user2Posts]
      ],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

// In-memory data storage
const user1Data = [];
const user2Data = [];

// Helper function to get latest item from an array
const getLatest = (arr) => arr.length > 0 ? arr[arr.length - 1] : null;

// POST for user1
app.post('/user1', (req, res) => {
  const { value } = req.body;
  if (value === undefined) {
    return res.status(400).json({ error: 'Missing value' });
  }
  user1Data.push(value);
  res.json({ message: 'Value stored for user1', data: value });
});

// GET all values for user1
app.get('/user1', (req, res) => {
  res.json({ user: 'user1', data: user1Data });
});

// GET latest value for user1
app.get('/user1/latest', (req, res) => {
  res.json({ user: 'user1', latest: getLatest(user1Data) });
});

// POST for user2
app.post('/user2', (req, res) => {
  const { value } = req.body;
  if (value === undefined) {
    return res.status(400).json({ error: 'Missing value' });
  }
  user2Data.push(value);
  res.json({ message: 'Value stored for user2', data: value });
});

// GET all values for user2
app.get('/user2', (req, res) => {
  res.json({ user: 'user2', data: user2Data });
});

// GET latest value for user2
app.get('/user2/latest', (req, res) => {
  res.json({ user: 'user2', latest: getLatest(user2Data) });
});

app.get("/api/trigger", async (req, res) => {
  res.send("ohio");
});

app.get('/api/discord/arcane/top100/:server', async (req, res) => {
  const server = req.params.server;
  res.json(await getArcaneTop100Leaderboard(server));
});

app.get('/api/discord/arcane/:id/:server', async (req, res) => {
  const id = req.params.id;
  const combinedData = await getArcaneTop100Leaderboard(server);
  const found = combinedData.find(entry => entry.id === id);

  if (found) {
    res.json(found);
  } else {
    res.status(404).json({ error: `User with ID ${id} not found in top 100.` });
  }
});

app.get('/api/database', async (req, res) => {
  res.json(await saveData());
});

app.get('/api/database/add/:platform/:user', async (req, res) => {
  const platform = req.params.platform;
  const user = req.params.user;
  res.json(await saveData(platform, user));
});

// Fetch the latest upload every hour
setInterval(fetchLatestSzaSzabiUpload, 1000 * 60 * 60);

// Simple CORS proxy
app.get("/corsproxy", async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: "Missing URL parameter" });

  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "text/plain";
    const data = await response.text();

    // Add CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "*");
    res.set("Content-Type", contentType);

    res.send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Discord bots

// ==== 2005 Claimer ====
const DISCORD_TOKEN_2005_CLAIMER = process.env.DISCORD_TOKEN_2005_CLAIMER;
const CLIENT_ID_2005_CLAIMER = process.env.CLIENT_ID_2005_CLAIMER; // needed for slash registration
const YOUTUBE_API_KEY_2005_CLAIMER = process.env.YOUTUBE_API_KEY_2005_CLAIMER;

// Cutoff dates
const HARDCUTOFF = new Date("2011-09-30T23:59:59Z"); // uploads
const SOFTCUTOFF = new Date("2009-05-31T23:59:59Z"); // soft cutoff

// ==================

const CLIENT_2005_CLAIMER = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const youtube = google.youtube({
  version: "v3",
  auth: YOUTUBE_API_KEY_2005_CLAIMER,
});

// Helper: build embed
function buildResultEmbed(title, url, reasons) {
  // Split reasons
  const notClaimable = reasons.filter(r => !r.includes("still might be claimable"));
  const possiblyNotClaimable = reasons.filter(r => r.includes("still might be claimable"));

  let description = "";
  if (notClaimable.length) {
    description += "__Not claimable:__\n" + notClaimable.map(r => `- ${r}`).join("\n") + "\n";
  }
  if (possiblyNotClaimable.length) {
    description += "__Possibly not claimable:__\n" + possiblyNotClaimable.map(r => `- ${r}`).join("\n");
  }
  if (!description) description = "- No red flags detected.";

  return new EmbedBuilder()
    .setTitle(notClaimable.length ? "Not claimable" : "Claimable")
    .setURL(url)
    .setDescription(description)
    .setColor(notClaimable.length ? 0xff0000 : 0x00ff00)
}

// Unified analyzer with deduplication
async function analyzeChannel(channel, username = null) {
  const reasons = new Set();

  // ---- Check channel creation date ----
  if (channel.snippet?.publishedAt) {
    const created = new Date(channel.snippet.publishedAt);
    if (created > new Date("2009-05-01")) {
      reasons.add("Channel created after May 2009 (still might be claimable)");
    }
  }

  // ---- Check uploads ----
  try {
    const uploadsPlaylist = channel.contentDetails?.relatedPlaylists?.uploads;
    if (uploadsPlaylist) {
      const uploads = await youtube.playlistItems.list({
        part: "snippet",
        playlistId: uploadsPlaylist,
        maxResults: 5,
      });

      if (uploads.data.items?.length) {
        const latest = uploads.data.items[0].snippet.publishedAt;
        if (new Date(latest) > new Date("2011-09-01")) {
          reasons.add("Has videos uploaded after September 2011");
        }
      }
    } else {
      reasons.add("Uploads playlist not found (legacy or hidden) (still might be claimable)");
    }
  } catch (err) {
    if (err.code === 404) {
      reasons.add("Uploads playlist not found (legacy or hidden) (still might be claimable)");
    } else {
      console.error("Error fetching uploads:", err);
      reasons.add("Error checking uploads playlist (still might be claimable)");
    }
  }

  // ---- Check banner ----
  if (channel.brandingSettings?.image?.bannerExternalUrl) {
    reasons.add("Has a banner");
  }

  // ---- Check country ----
  if (channel.brandingSettings?.channel?.country) {
    reasons.add("Has a country set");
  }

  // ---- Check username vs channel name ----
  if (username && channel.snippet?.title) {
    if (channel.snippet.title.toLowerCase() !== username.toLowerCase()) {
      reasons.add("Channel name isn't the same as username");
    }
  }

  // ---- Check playlists ----
  try {
    const playlists = await youtube.playlists.list({
      part: "id",
      channelId: channel.id,
      maxResults: 5,
    });
    for (const pl of playlists.data.items || []) {
      if (pl.id.length > 18) {
        reasons.add("Has a playlist with its ID longer than 18 characters");
      }
    }
  } catch (err) {
    console.error("Error fetching playlists:", err);
    reasons.add("Error checking playlists (still might be claimable)");
  }

  // ---- Check Shorts tab ----
  try {
    const tabs = channel.topicDetails?.topicCategories || [];
    if (tabs.some(t => t.toLowerCase().includes("shorts"))) {
      reasons.add("Has the 'Shorts' tab");
    }
  } catch {
    // ignore silently
  }

  return Array.from(reasons); // always return array
}

// Helper: get channel by username using API URL
async function getByUsernameAPI(username) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forUsername=${encodeURIComponent(username)}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.items || !data.items.length) return null;

    return data.items[0]; // returns channel object
  } catch (err) {
    console.error("Error fetching channel via API URL:", err);
    return null;
  }
}

// Helper: format timestamp in UTC YYYY-MM-DD HH:MM:SS
function formatUTC(dateStr) {
  const d = new Date(dateStr);
  return (
    d.getUTCFullYear() +
    "-" +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getUTCDate()).padStart(2, "0") +
    " " +
    String(d.getUTCHours()).padStart(2, "0") +
    ":" +
    String(d.getUTCMinutes()).padStart(2, "0") +
    ":" +
    String(d.getUTCSeconds()).padStart(2, "0")
  );
}

// --- Get channel via legacy username feed ---
async function getByUsernameFeed(username) {
  try {
    const urlFeed = `https://www.youtube.com/feeds/videos.xml?user=${encodeURIComponent(username)}`;
    const res = await fetch(urlFeed);
    if (!res.ok) return null;
    const text = await res.text();
    const parsed = await xml2js.parseStringPromise(text);

    // ✅ Get proper channelId from <link rel="alternate">
    const links = parsed.feed?.link || [];
    const altLink = links.find(l => l.$.rel === "alternate");
    if (!altLink) return null;

    const channelUrl = altLink.$.href; // e.g. https://www.youtube.com/channel/UCVC_LshjFEotcngMGgEslyA
    const channelId = channelUrl.split("/").pop();
    if (!channelId) return null;

    const channelRes = await youtube.channels.list({
      part: "snippet,brandingSettings,contentDetails",
      id: channelId,
    });
    if (!channelRes.data.items?.length) return null;

    return { channel: channelRes.data.items[0], username };
  } catch (err) {
    console.error(err);
    return null;
  }
}

// ================== EID / IED ==================

async function getEidRowByUsername(username) {
  const data = await getByUsernameFeed(username);
  if (!data) return null;

  const { channel } = data;
  const d = new Date(channel.snippet.publishedAt);

  const formatted =
    d.getUTCFullYear() + "-" +
    String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
    String(d.getUTCDate()).padStart(2, "0") + " " +
    String(d.getUTCHours()).padStart(2, "0") + ":" +
    String(d.getUTCMinutes()).padStart(2, "0") + ":" +
    String(d.getUTCSeconds()).padStart(2, "0");

  return `${channel.id}\t${formatted}`;
}

// --- Get channel via handle ---
async function getByHandleAPI(handle) {
  try {
    const handleName = handle.startsWith("@") ? handle : `@${handle}`;
    const res = await youtube.channels.list({
      part: "snippet,brandingSettings,contentDetails",
      forHandle: handleName,
    });
    if (!res.data.items?.length) return null;
    return { channel: res.data.items[0], username: null };
  } catch (err) {
    console.error(err);
    return null;
  }
}

// --- Get channel via ID ---
async function getByChannelId(channelId) {
  const res = await youtube.channels.list({
    part: "snippet,brandingSettings,contentDetails",
    id: channelId,
  });
  if (!res.data.items?.length) return null;
  return { channel: res.data.items[0], username: null };
}

// --- Name search ---
async function getByQuery(query) {
  const res = await youtube.search.list({
    part: "snippet",
    type: "channel",
    q: query,
    maxResults: 1,
  });
  if (!res.data.items?.length) return null;
  return getByChannelId(res.data.items[0].snippet.channelId);
}

// --- Shared executor ---
async function executeCheck(type, value, target) {
  let channelData = null;
  let url = "";

  if (type === "cu") {
    channelData = await getByUsernameFeed(value);
    if (!channelData) return reply(target, "❌ No channel found via feed");
    url = `https://youtube.com/user/${value}`;
  } else if (type === "ch") {
    channelData = await getByHandleAPI(value);
    if (!channelData) return reply(target, "❌ No channel found via handle");
    url = `https://youtube.com/${value}`;
  } else if (type === "ci") {
    channelData = await getByChannelId(value);
    if (!channelData) return reply(target, "❌ No channel found via ID");
    url = `https://youtube.com/channel/${value}`;
  } else if (type === "cc") {
    channelData = await getByQuery(value);
    if (!channelData) return reply(target, "❌ No channel found via search");
    url = `https://youtube.com/channel/${channelData.channel.id}`;
  }

  if (channelData) {
    const { channel, username } = channelData;
    const reasons = await analyzeChannel(channel, username);
    const embed = buildResultEmbed(channel.snippet.title, url, reasons);
    return reply(target, { embeds: [embed] });
  }
}

// Helper to reply to message or interaction
function reply(target, content) {
  if (target.reply) return target.reply(content);
  if (target.isRepliable()) return target.reply(content);
}

function getTargetBirthdayDate() {
  const now = new Date();
  const target = new Date();
  target.setFullYear(now.getFullYear() - BIRTHDAY_YEARS);
  target.setDate(target.getDate() - BIRTHDAY_DAYS);
  return target;
}

function findNextChannel(channels, lastChannel) {
  const targetDate = getTargetBirthdayDate();

  // Find index of last sent
  let startIndex = 0;
  if (lastChannel) {
    startIndex = channels.findIndex(c => c[2] === lastChannel[2]) + 1;
  }

  for (let i = startIndex; i < channels.length; i++) {
    const channel = channels[i];
    const created = new Date(channel[3]);
    if (created <= targetDate) {
      return channel;
    }
  }
  return null;
}

async function sendBirthdayMessages(messageChannel) {
  let nextChannel = findNextChannel(channels, lastSentChannel);

  if (!nextChannel) return console.log("No upcoming birthday channels found.");

  // There might be multiple channels on the exact same second
  const sameTimeChannels = channels.filter(c => c[3] === nextChannel[3]);

  for (const channel of sameTimeChannels) {
    await messageChannel.send(
      `🎉 It's time for **${channel[0]}** (@${channel[1]}) — created on ${channel[3]}!`
    );
    lastSentChannel = channel; // update last sent
  }
}

// ===== TEXT COMMANDS =====
CLIENT_2005_CLAIMER.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Get the channel to send messages
  const messageChannel = await bot.channels.fetch(CHANNEL_ID);

  // Trigger birthday notifications at startup
  if (!messageChannel) {
    console.error("Discord channel not found!");
    return;
  }

  // Send next birthday channel
  await sendBirthdayMessages(messageChannel);  

  const [cmd, arg] = message.content.split(" ");
  if (!cmd) return;

if (cmd === "!cdu" && arg) {
    try {
      const username = arg.replace(/[<>]/g, "");
      const targetUrl = `https://www.youtube.com/user/${username}`;

      const cdxUrl =
        "https://web.archive.org/cdx/search/cdx" +
        `?url=${encodeURIComponent(targetUrl)}` +
        "&output=json" +
        "&fl=timestamp,original,statuscode" +
        "&filter=statuscode:200" +
        "&to=20111231235959" +
        "&collapse=timestamp:8" +
        "&sort=ascending";

      const res = await fetch(cdxUrl);
      if (!res.ok) {
        return message.reply("❌ Failed to contact Wayback CDX API");
      }

      const json = await res.json();

      if (!json || json.length <= 1) {
        return message.reply(`No archives found before 2012 for \`${username}\``);
      }

      const rows = json.slice(1);

      const lines = rows.map(row => {
        const ts = row[0];
        const archiveUrl = `https://web.archive.org/web/${ts}/${targetUrl}`;

        const formatted =
          ts.slice(0,4) + "-" +
          ts.slice(4,6) + "-" +
          ts.slice(6,8) + " " +
          ts.slice(8,10) + ":" +
          ts.slice(10,12) + ":" +
          ts.slice(12,14) + " UTC";

        return `[${formatted}](${archiveUrl})`;
      });

      await message.reply(
        `Wayback archives for ${targetUrl} (before 2012)\nTotal: ${lines.length}`
      );

      let buffer = "";

      for (const line of lines) {
        if (buffer.length + line.length + 1 > 2000) {
          await message.channel.send(buffer);
          buffer = "";
        }
        buffer += line + "\n";
      }

      if (buffer.length > 0) {
        await message.channel.send(buffer);
      }

    } catch (err) {
      console.error(err);
      message.reply("❌ Failed to fetch archive data");
    }
  }

if (cmd === "!ccu" && arg) {
    try {
      const username = arg.replace(/[<>]/g, "");

      const countries = [
        "ca","mx","br","en","uk","ie","es","fr","nl","de",
        "cz","it","pl","se","ru","il","in","kr","jp","hk",
        "tw","au","nz"
      ];

      const found = [];

      for (const cc of countries) {

        // Format 1: xx.youtube.com
        const subdomainUrl = `https://${cc}.youtube.com/user/${username}`;
        const api1 = `https://archive.org/wayback/available?url=${encodeURIComponent(subdomainUrl)}`;

        const r1 = await fetch(api1);
        const j1 = await r1.json();

        if (j1?.archived_snapshots?.closest?.available) {
          found.push(`[${cc}.youtube.com](${j1.archived_snapshots.closest.url})`);
        }

        // Format 2: youtube.xx
        const tldUrl = `https://www.youtube.${cc}/user/${username}`;
        const api2 = `https://archive.org/wayback/available?url=${encodeURIComponent(tldUrl)}`;

        const r2 = await fetch(api2);
        const j2 = await r2.json();

        if (j2?.archived_snapshots?.closest?.available) {
          found.push(`[youtube.${cc}](${j2.archived_snapshots.closest.url})`);
        }
      }

      // FTP (subdomain only)
      const ftpUrl = `http://ftp.youtube.com/user/${username}`;
      const ftpApi = `https://archive.org/wayback/available?url=${encodeURIComponent(ftpUrl)}`;

      const rftp = await fetch(ftpApi);
      const jftp = await rftp.json();

      if (jftp?.archived_snapshots?.closest?.available) {
        found.push(`[ftp.youtube.com](${jftp.archived_snapshots.closest.url})`);
      }

      if (found.length === 0) {
        return message.reply(`❌ No archived country domains found for \`${username}\``);
      }

      await message.reply(
        `🌍 Country archives for **${username}**:\n` + found.join("\n")
      );

    } catch (err) {
      console.error("CCU error:", err);
      message.reply("❌ Failed to check country archives");
    }
  }
  
  // === .check command ===
  if (cmd === ".check") {
    const embed = new EmbedBuilder()
      .setTitle("YouTube Claimability Bot Commands")
      .setDescription(
        "`.cu <username>` → legacy username\n" +
        "`.ci <channelId>` → channel ID\n" +
        "`.ch <@handle>` → YouTube handle\n" +
        "`.cc <name>` → search by channel name\n" +
        "`.eid <username>` → channel ID + creation date\n" +
        "`!inc <username>` → single CSV ID+timestamp\n" +
        "`!inc <range>` + multi usernames → CSV multi output"
      )
      .setColor(0x3498db);
    return message.reply({ embeds: [embed] });
  }

  // === !eid command ===
  if (cmd === "!eid" && arg) {
    const row = await getEidRowByUsername(arg);
    if (!row) return message.reply("❌ Channel not found");
    return message.reply(row);
  }

  // === NEW !inc command ===
  if (message.content.startsWith("!inc")) {
    const lines = message.content
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    // --- SINGLE username ---
    if (lines.length === 1) {
      const parts = lines[0].split(" ");
      if (parts.length < 2) return message.reply("❌ Provide a username");

      const username = parts[1].replace(/[<>]/g, "");
      const channel = await getByUsernameAPI(username);
      if (!channel) return message.reply("❌ Channel not found");

      const timestamp = formatUTC(channel.snippet.publishedAt);

      return message.reply(`\`${channel.id},${timestamp}\``);
    }

    // --- MULTI usernames ---
    const headerMatch = lines[0].match(/<([\d,]+-[\d,]+)>/);
    if (!headerMatch) return message.reply("❌ Invalid range header");

    const rankRange = headerMatch[1];
    const usernames = lines.slice(1).map(u => u.replace(/[<>]/g, ""));
    if (!usernames.length) return message.reply("❌ No usernames provided");

    const results = [];

    for (const username of usernames) {
      const channel = await getByUsernameAPI(username);
      if (!channel) continue;

      const timestamp = formatUTC(channel.snippet.publishedAt);

      results.push({
        username,
        id: channel.id,
        timestamp,
      });
    }

    if (!results.length) return message.reply("❌ No valid channels found");

    // Build confirmation sentence
    const confirmationNames = results.map(r =>
      `${r.username} (${r.timestamp})`
    );

    let joinedNames = "";
    if (confirmationNames.length === 1) {
      joinedNames = confirmationNames[0];
    } else if (confirmationNames.length === 2) {
      joinedNames = confirmationNames.join(" and ");
    } else {
      joinedNames =
        confirmationNames.slice(0, -1).join(" and ") +
        " and " +
        confirmationNames.slice(-1);
    }

    const confirmation =
      `confirmed because no other channels were created between ${rankRange} ` +
      `therefore ${joinedNames} are between with join dates available`;

    // Build final CSV-friendly output with two spaces before confirmation
    const output = results
      .map(r => `${r.id},${r.timestamp},  "${confirmation}"`)
      .join("\n");

    return message.reply("```\n" + output + "\n```");
  }

  // === Other legacy check commands (.cu, .ci, .ch, .cc) ===
  if ([".cu", ".ci", ".ch", ".cc"].includes(cmd) && arg) {
    await executeCheck(cmd.slice(1), arg, message);
  }
});

CLIENT_2005_CLAIMER.login(DISCORD_TOKEN_2005_CLAIMER);


// End of discord bots

// Create a WebSocket server for client tracking
const clientCounters = new WebSocketServer({ server, path: '/clients' });

// Map to track clients by page URL
let clientsByUrl = new Map(); // Map<url, Set<WebSocket>>

clientCounters.on('connection', (ws, req) => {
  // Get the ?url=... query parameter from the connection
  const params = new URLSearchParams(req.url.split('?')[1]);
  const pageUrl = params.get('url') || 'unknown';

  console.log(`Client connected from: ${pageUrl}`);

  // Add client to its group
  if (!clientsByUrl.has(pageUrl)) {
    clientsByUrl.set(pageUrl, new Set());
  }
  clientsByUrl.get(pageUrl).add(ws);

  // Log and broadcast
  console.log(`Client connected. Total clients: ${getTotalClientCount()}`);
  broadcastClientCounts();

  ws.on('close', () => {
    // Remove client
    const set = clientsByUrl.get(pageUrl);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        clientsByUrl.delete(pageUrl);
      }
    }

    console.log(`Client disconnected. Total clients: ${getTotalClientCount()}`);
    broadcastClientCounts();
  });
});

// Helper: total count
function getTotalClientCount() {
  let total = 0;
  for (const set of clientsByUrl.values()) {
    total += set.size;
  }
  return total;
}

// Helper: per-URL breakdown
function getClientCountsByUrl() {
  const counts = {};
  for (const [url, set] of clientsByUrl.entries()) {
    counts[url] = set.size;
  }
  return counts;
}

// Send count updates to all clients

function broadcastClientCounts() {
  const data = {
    clientCount: getTotalClientCount(),
    clientsByUrl: getClientCountsByUrl(),
  };

  const message = JSON.stringify(data);
  clientCounters.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// REST API endpoint to fetch counts
app.get('/api/client-count', (req, res) => {
  res.json({
    clientCount: getTotalClientCount(),
    clientsByUrl: getClientCountsByUrl(),
  });
});

// --- WebSocket setup (/shxp?server=ID) ---
const shxpSocket = new WebSocketServer({ server, path: "/shxp" });
const serverDataCache = new Map(); // per-server: { latestData, clients, interval }

// Fetch + broadcast wrapper
async function updateAndBroadcast(serverId) {
  const state = serverDataCache.get(serverId);
  if (!state) return;

  try {
    const result = await getArcaneTop100Leaderboard(serverId);
    state.latestData = result;

    for (const client of state.clients) {
      if (client.readyState === 1) {
        client.send(JSON.stringify(result));
      }
    }

    console.log(`[shxp:${serverId}] Broadcasted to ${state.clients.size} clients`);
  } catch (err) {
    console.error(`[shxp:${serverId}] Error fetching leaderboard:`, err);
  }
}

// Handle WebSocket connections
shxpSocket.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const serverId = url.searchParams.get("server");

  if (!serverId) {
    ws.send(JSON.stringify({ error: "Missing ?server parameter" }));
    ws.close();
    return;
  }

  // Ensure server state exists
  if (!serverDataCache.has(serverId)) {
    serverDataCache.set(serverId, {
      latestData: null,
      clients: new Set(),
      interval: null,
    });
  }

  const state = serverDataCache.get(serverId);
  state.clients.add(ws);

  // Send cached data immediately if available
  if (state.latestData !== null) {
    ws.send(JSON.stringify(state.latestData));
  }

  // Start the loop if not running
  if (!state.interval) {
    console.log(`[shxp:${serverId}] Starting 1-min loop`);
    updateAndBroadcast(serverId);
    state.interval = setInterval(() => updateAndBroadcast(serverId), 60 * 1000);
  }

  ws.on("close", () => {
    state.clients.delete(ws);
    if (state.clients.size === 0) {
      console.log(`[shxp:${serverId}] No clients left, stopping loop`);
      clearInterval(state.interval);
      serverDataCache.delete(serverId);
    }
  });
});

const wssstores = new WebSocketServer({ port: 8080 });

// key -> lastValue
const wsstores = {};

wssstores.on('connection', (ws, req) => {
    // Parse query params to get the store key (e.g., ?counter=num4)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const store = url.searchParams.get('counter');
    ws.on('message', (msg) => {
        try {
            const { store, value } = JSON.parse(msg);
            if (!store) return;

            wsstores[store] = value;

            // broadcast to all clients
            wssstores.clients.forEach(client => {
                if (client.readyState === client.OPEN) {
                    client.send(JSON.stringify({ store, value }));
                }
            });
        } catch (e) {
            console.error('Invalid message:', msg);
        }
    });

    // On connection, send only the selected store's current value
    if (store && wsstores[store] !== undefined) {
        ws.send(JSON.stringify({ store, value: wsstores[store] }));
    }

    // Broadcast handling remains the same
    Object.entries(wsstores).forEach(([store, value]) => {
        ws.send(JSON.stringify({ store, value }));
    });
});

module.exports = app;

const port = process.env.PORT || 10000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  fetchLatestSzaSzabiUpload(); // Fetch initial data on startup
});
