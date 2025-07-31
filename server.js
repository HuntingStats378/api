const express = require("express");
const axios = require("axios");
const cors = require("cors");
const http = require('http');
const WebSocket = require('ws');
const puppeteer = require('puppeteer');
const { Client, GatewayIntentBits } = require('discord.js');
const app = express();
app.use(cors());

// === Discord Bot Setup ===
const bot = new Client({ intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.Guilds], partials: ['CHANNEL'] });
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const server = http.createServer(app);
const wsszu = new WebSocket.Server({ server, path: "/websocket/szaszabi-upload" });
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
let latestSzaSzabiUpload = null;
let overriddenUser2 = null; // Store override in memory
const ARCANE_API_KEY = process.env.ARCANE_API_KEY;
const LURKR_API_KEY = process.env.LURKR_API_KEY;
let targetElementId = 'liveCounter'; // Default ID
let isSiteLive = false;
let lastKnownValue = null;
let interval = null;
const CHECK_INTERVAL = 30_000; // 30 seconds
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

async function fetchLatestSzaSzabiUpload() {
    try {
        const response = await axios.get(
            `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=UCx2ey9QUf1Ja4sV3EdavwSg&part=snippet&order=date&type=video&maxResults=1`
        );

        if (response.data.items.length > 0) {
            latestSzaSzabiUpload = response.data.items[0];

            // Broadcast update to all WebSocket clients
            wsszu.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(latestSzaSzabiUpload));
                }
            });
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

wsszu.on("connection", (ws) => {
    console.log("New WebSocket connection established");

    ws.on("message", (message) => {
        console.log("Received message:", message);
        // Handle incoming messages if needed
    });

    ws.on("close", () => {
        console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
    });

    // Send the latest upload data to the client if available
    if (latestSzaSzabiUpload) {
        ws.send(JSON.stringify(latestSzaSzabiUpload));
    }
});

// === WebSocket Server Setup ===
const ipad_uptime = new WebSocket.Server({ server, path: '/websocket/ipad-uptime' });

ipad_uptime.on('connection', async function connection(ws, req) {
  const ip = req.socket.remoteAddress;
  console.log(`Client connected from ${ip}`);

  try {
    const user = await bot.users.fetch(OWNER_ID);
    user.send(`📶 WebSocket connection established from ${ip}`);
  } catch (err) {
    console.error('Failed to send DM:', err);
  }

  ws.on('close', async () => {
    console.log(`Client disconnected from ${ip}`);
    try {
      const user = await bot.users.fetch(OWNER_ID);
      user.send(`❌ WebSocket connection closed from ${ip}`);
    } catch (err) {
      console.error('Failed to send DM:', err);
    }
  });
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

// === TeamWater WebSocket Server Setup ===
const teamwater = new WebSocket.Server({ server, path: '/websocket/teamwater' });

async function sendDiscordDM(message) {
  try {
    const user = await bot.users.fetch(OWNER_ID);
    await user.send(message);
    console.log('📬 Sent DM');
  } catch (err) {
    console.error('❌ DM error:', err.message);
  }
}

// ========== Redirect Checker ==========
async function checkIfLive() {
  try {
    const res = await fetch('https://teamwater.org', {
      redirect: 'manual'
    });

    if (res.status === 301 || res.status === 302) {
      console.log('🔁 Still redirecting to soon.teamwater.org');
    } else {
      console.log('✅ teamwater.org is now live!');
      isSiteLive = true;
      await sendDiscordDM(`🌊 teamwater.org is now live! Watching for element: #${targetElementId}`);
      startScraping();
    }
  } catch (err) {
    console.error('🌐 Redirect check failed:', err.message);
  }
}

// ========== WebSocket ==========
function broadcast(data) {
  const json = JSON.stringify(data);
  teamwater.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// ========== Scraper ==========
async function getElementText() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://teamwater.org', { waitUntil: 'networkidle2' });

  const value = await page.evaluate(id => {
    const el = document.getElementById(id);
    return el?.textContent?.trim() || null;
  }, targetElementId);

  await browser.close();
  return value;
}

function startScraping() {
  interval = setInterval(async () => {
    try {
      const value = await getElementText();
      if (value && value !== lastKnownValue) {
        lastKnownValue = value;
        console.log(`📈 #${targetElementId} = ${value}`);
        broadcast({ type: 'counter', data: { id: targetElementId, value } });
      }
    } catch (err) {
      console.error('Scraping error:', err.message);
    }
  }, 2000);
}

// ========== API Routes ==========

// Keep Render awake + allow override
app.get('/ping', (req, res) => {
  if (req.query.id) {
    targetElementId = req.query.id;
    console.log(`🔄 Updated element ID to: ${targetElementId}`);
  }
  res.send(`✅ Ping received. Monitoring ID: #${targetElementId}`);
});

// Root
app.get('/', (req, res) => {
  res.send('🌊 TeamWater monitor running');
});

// WebSocket
teamwater.on('connection', ws => {
  console.log('🔌 WS client connected');
  if (lastKnownValue) {
    ws.send(JSON.stringify({ type: 'counter', data: { id: targetElementId, value: lastKnownValue } }));
  }
});

module.exports = app;

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    fetchLatestSzaSzabiUpload(); // Fetch initial data on startup
    setInterval(() => {
    if (!isSiteLive) checkIfLive();
    }, CHECK_INTERVAL);
    checkIfLive();
});
