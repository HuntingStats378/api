const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
app.use(cors());

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

async function fetchyoutubechannel(channelId) {
  try {
    let response;

    try {
      // Attempt to fetch data from the primary API (Mixerno)
      response = await axios.get(
        `https://mixerno.space/api/youtube-channel-counter/user/${channelId}`
      );
    } catch (error) {
      console.warn("Mixerno API failed, trying backup API...");

      // Attempt to fetch data from the backup API (NextCounts)
      respons3e = await axios.get(
        `https://livecounts.xyz/api/youtube-live-subscriber-count/live/${channelId}`
      );
    }

    // Fetch data from the second API
    const respons2e = await axios.get(
      `https://api-v2.nextcounts.com/api/youtube/channel/${channelId}`
    );

    // Extract required data
    const subCount = response.data.counts[0].count || respons3e.data.counts[0];
    const totalViews = response.data.counts[3].count || respons3e.data.counts[1];
    const apiViews = response.data.counts[4].count | respons3e.data.counts[1];
    const apiSubCount = response.data.counts[2].count || respons3e.data.user.subscriberCount;
    const videos = response.data.counts[5].count || respons3e.data.counts[2];
    const channelLogo = response.data.user[1].count || respons3e.data.user.pfp;
    const channelName = response.data.user[0].count || respons3e.data.user.name;
    const channelBanner = response.data.user[2].count || `https://banner.tf/${channelId}`;
    const goalCount = getGoal(subCount);

    if (respons2e.data.verifiedSubCount === true) {
      return {
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
        ],
        studio: respons2e.data.subcount
      };
    } else if (channelId === "UCX6OQ3DkcsbYNE6H8uQQuVA") {
      const mrbeast = await axios.get(`https://mrbeast.subscribercount.app/data`);
      return {
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
        ],
        studio: mrbeast.data.mrbeast
      };
    } else {
      return {
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
    }
  } catch (error) {
    console.error("Both APIs failed:", error);
    throw new Error("Failed to fetch counts from both primary and backup APIs.");
  }
}

async function fetchyoutubevideo(videoId) {
  try {
    const [response, respons2e, respons3e] = await Promise.all([
      axios.get(`https://mixerno.space/api/youtube-video-counter/user/${videoId}`),
      axios.get(`https://mixerno.space/api/youtube-stream-counter/user/${videoId}`),
      axios.get(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`)
    ]);

    const subCount = response.data.counts[0].count;
    const totalViews = response.data.counts[3].count;
    const apiViews = respons3e.data.dislikes;
    const apiSubCount = response.data.counts[2].count;
    const videos = response.data.counts[5].count;
    const channelLogo = response.data.user[1].count;
    const channelName = response.data.user[0].count;
    const channelBanner = response.data.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchyoutubestream(videoId) {
  try {
    const [response, respons2e, respons3e] = await Promise.all([
      axios.get(`https://mixerno.space/api/youtube-video-counter/user/${videoId}`),
      axios.get(`https://mixerno.space/api/youtube-stream-counter/user/${videoId}`),
      axios.get(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`)
    ]);

    const liveCount = respons2e.data.counts[0].count;
    const subCount = response.data.counts[0].count;
    const totalViews = response.data.counts[3].count;
    const apiViews = respons3e.data.dislikes;
    const apiSubCount = response.data.counts[2].count;
    const videos = response.data.counts[5].count;
    const channelLogo = response.data.user[1].count;
    const channelName = response.data.user[0].count;
    const channelBanner = response.data.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [liveCount, goalCount, subCount, apiSubCount, totalViews, apiViews, videos], user: [channelName, channelLogo, channelBanner] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchinstagramuser(userId) {
  try {
    const response = await axios.get(`https://api-v2.nextcounts.com/api/instagram/user/${userId}`);

    const subCount = response.data.followers;
    const totalViews = response.data.posts;
    const apiSubCount = response.data.following;
    const channelLogo = response.data.avatar;
    const channelName = response.data.nickname;
    const channelBanner = response.data.userBanner;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews], user: [channelName, channelLogo, channelBanner] };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch counts" };
  }
}

async function fetchtiktokuser(userId) {
  try {
    const response = await axios.get(`https://mixerno.space/api/tiktok-user-counter/user/${userId}`);

    const subCount = response.data.counts[0].count;
    const totalViews = response.data.counts[4].count;
    const apiViews = response.data.counts[3].count;
    const apiSubCount = response.data.counts[2].count;
    const channelLogo = response.data.user[1].count;
    const channelName = response.data.user[0].count;
    const channelBanner = response.data.user[2].count;
    const goalCount = getGoal(subCount);

    return { "t": new Date(), counts: [subCount, goalCount, apiSubCount, totalViews, apiViews], user: [channelName, channelLogo, channelBanner] };
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

app.get("/api/streams/mrbeastrise", async (req, res) => {
  try {
    // Fetch data from external API
    const { data: ids } = await axios.get(
      `https://huntingstats378.github.io/streams/mrbeastrise/ids.json`
    );

    if (!ids.user1 || !ids.user2) {
      return res.status(400).json({ error: "Missing user IDs in response" });
    }

    const user1 = await fetchyoutubechannel(ids.user1);

    const { data: mrbeast } = await axios.get(
      `https://mrbeast.subscribercount.app/data`
    );

    const user2 = await fetchinstagramuser(ids.user2);

    // Ensure we have valid counts
    const user1Count = mrbeast.mrbeast || user1.counts[0];
    const user2Followers = user2.counts[0];
    const user2Following = user2.counts[2];
    const user2Posts = user2.counts[3];

    const gap = Math.abs(user2Followers - user1Count);

    res.json({
      t: new Date(),
      gap: gap,
      counts: [
        [ids.platform1, ids.user1, user1Count, user1.counts[3], user1.counts[5]],
        [ids.platform2, ids.user2, user2Followers, user2Following, user2Posts]
      ],
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

app.get("/api/trigger", async (req, res) => {
        res.send("ohio");
});

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
