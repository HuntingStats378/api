const express = require("express");
const axios = require("axios");
const cors = require("cors");
const http = require('http');
const WebSocket = require('ws');
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

async function getTop100Leaderboard() {
    const [res50, res100, res150, res200, res250, res300, res350, res400, res450, res500, res550, res600] = await Promise.all([
        fetch(`${ARCANE_API_BASE}?limit=50&page=0`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=1`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=2`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=3`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=4`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=5`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=6`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=7`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=8`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=9`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=10`, { headers: HEADERS }),
        fetch(`${ARCANE_API_BASE}?limit=50&page=11`, { headers: HEADERS })
    ]);

    const data50 = await res50.json();
    const data100 = await res100.json();
    const data150 = await res150.json();
    const data200 = await res200.json();
    const data250 = await res250.json();
    const data300 = await res300.json();
    const data350 = await res350.json();
    const data400 = await res400.json();
    const data450 = await res450.json();
    const data500 = await res500.json();
    const data550 = await res550.json();
    const data600 = await res600.json();

    const top50 = Array.isArray(data50.levels) ? data50.levels : [];
    const top100 = Array.isArray(data100.levels) ? data100.levels : [];
    const top150 = Array.isArray(data150.levels) ? data150.levels : [];
    const top200 = Array.isArray(data200.levels) ? data200.levels : [];
    const top250 = Array.isArray(data250.levels) ? data250.levels : [];
    const top300 = Array.isArray(data300.levels) ? data300.levels : [];
    const top350 = Array.isArray(data350.levels) ? data350.levels : [];
    const top400 = Array.isArray(data400.levels) ? data400.levels : [];
    const top450 = Array.isArray(data450.levels) ? data450.levels : [];
    const top500 = Array.isArray(data500.levels) ? data500.levels : [];
    const top550 = Array.isArray(data550.levels) ? data550.levels : [];
    const top600 = Array.isArray(data600.levels) ? data600.levels : [];

    return [...top50, ...top100, ...top150, ...top200, ...top250, ...top300, ...top350, ...top400, ...top450, ...top500, ...top550, ...top600];
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
      `https://mixerno.space/api/youtube-channel-counter/user/${channelId}`
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

    const subCount = response.counts[0].count;
    const totalViews = response.counts[3].count;
    const apiViews = response.counts[4].count;
    const apiSubCount = response.counts[2].count;
    const videos = response.counts[5].count;
    const channelLogo = response.user[1].count;
    const channelName = response.user[0].count;
    const channelBanner = response.user[2].count;
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
      user: [channelName, channelLogo, channelBanner],
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

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner] };
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

    return { "t": new Date(), counts: [liveCount, goalCount, subCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchinstagramuser(userId) {
  try {
    const data = await fetch(`https://api-v2.nextcounts.com/api/instagram/user/${userId}`);

    const response = await data.json();
    const subCount = response.followers;
    const totalViews = response.posts;
    const apiSubCount = response.following;
    const channelLogo = response.avatar;
    const channelName = response.nickname;
    const channelBanner = response.userBanner;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews], user: [channelName, channelLogo, channelBanner] };
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

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews], user: [channelName, channelLogo, channelBanner] };
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

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos, extra], user: [channelName, channelLogo, channelBanner] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchtwitteruser(userId) {
  try {
    const response = await axios.get(`https://mixerno.space/api/twitter-user-counter/user/${userId}`);

    const subCount = response.data.counts[0].count;
    const totalViews = response.data.counts[3].count;
    const apiViews = response.data.counts[4].count;
    const apiSubCount = response.data.counts[2].count;
    const videos = response.data.counts[5].count;
    const extra = response.data.counts[6].count;
    const channelLogo = response.data.user[1].count;
    const channelName = response.data.user[0].count;
    const channelBanner = response.data.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos, extra], user: [channelName, channelLogo, channelBanner] };
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

const ARCANE_API_BASE = 'https://arcane.bot/api/guilds/1150096734576451614/levels/leaderboard';
const ARCANE_API_KEY = process.env.ARCANE_API_KEY;
const HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'x-user-agent': 'Arcane-Bot-5.0',
    'Authorization': ARCANE_API_KEY
};

app.get('/api/discord/statistics/top100', async (req, res) => {
    res.json(await getTop100Leaderboard());
});

app.get('/api/discord/statistics/:id', async (req, res) => {
    const id = req.params.id;
    const combinedData = await getTop100Leaderboard();
    const found = combinedData.find(entry => entry.id === id);

    if (found) {
        res.json(found);
    } else {
        res.status(404).json({ error: `User with ID ${id} not found in top 100.` });
    }
});

// Fetch the latest upload every hour
setInterval(fetchLatestSzaSzabiUpload, 1000 * 60 * 60);

module.exports = app;

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    fetchLatestSzaSzabiUpload(); // Fetch initial data on startup
});
