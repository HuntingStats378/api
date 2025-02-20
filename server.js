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

// API route to get YouTube live subscriber count
app.get("/api/youtube/channel/:channelId", async (req, res) => {
  const { channelId } = req.params;

  try {
    // Fetch data from the external API
    const response = await axios.get(
      `https://mixerno.space/api/youtube-channel-counter/user/${channelId}`
    );
    const subCount = response.data.counts[0].count;
    const totalViews = response.data.counts[3].count;
    const apiViews = response.data.counts[4].count;
    const apiSubCount = response.data.counts[2].count;
    const videos = response.data.counts[5].count;
    const channelLogo = response.data.user[1].count;
    const channelName = response.data.user[0].count;
    const channelBanner = response.data.user[2].count;
    const goalCount = getGoal(subCount);

    res.json({"t": new Date(),
      counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos],
      user: [channelName, channelLogo, channelBanner],
      value: [["Subscribers", "Subscribers (EST)"],["Goal", `Subscribers to ${abbreviateNumber(getGoalText(subCount))}`],["Subscribers", "Subscribers (API)"],["Views", "Views (EST)"],["Views", "Views (API)"],["Videos", "Videos (API)"]]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

app.get("/api/youtube/channel/:channelId/studio", async (req, res) => {
  const { channelId } = req.params;

  try {
    // Fetch data from the external API
    const response = await fetch(
      `https://api-v2.nextcounts.com/api/youtube/channel/${channelId}`
    );
    const respons2e = await axios.get(
      `https://mixerno.space/api/youtube-channel-counter/user/${channelId}`
    );
    const info = await response.json();
    const subCount = info.subcount;
    const totalViews = respons2e.data.counts[3].count;
    const apiSubCount = respons2e.data.counts[2].count;
    const videos = respons2e.data.counts[5].count;
    const apiViews = respons2e.data.counts[4].count;
    const channelLogo = respons2e.data.user[1].count;
    const channelName = respons2e.data.user[0].count;
    const channelBanner = respons2e.data.user[2].count;
    const goalCount = getGoal(subCount);

    res.json({"t": new Date(),
      counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos],
      user: [channelName, channelLogo, channelBanner],
      value: [["Subscribers", "Subscribers (STUDIO)"],["Goal", `Subscribers to ${abbreviateNumber(getGoalText(subCount))}`],["Subscribers", "Subscribers (API)"],["Views", "Views (EST)"],["Views", "Views (API)"],["Videos", "Videos (API)"]]
    });
  } catch (error) {
    console.error(error);
    res.status(200).json({ success: "Not in studio." });
  }
});

// API route to get YouTube live subscriber count
app.get("/api/youtube/video/:videoId", async (req, res) => {
  const { videoId } = req.params;

  try {
    // Fetch data from the external API
    const response = await axios.get(
      `https://mixerno.space/api/youtube-video-counter/user/${videoId}`
    );
    const respons2e = await axios.get(
      `https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`
    );
    const subCount = response.data.counts[0].count;
    const totalViews = response.data.counts[3].count;
    const apiViews = respons2e.data.dislikes;
    const apiSubCount = response.data.counts[2].count;
    const videos = response.data.counts[5].count;
    const channelLogo = response.data.user[1].count;
    const channelName = response.data.user[0].count;
    const channelBanner = response.data.user[2].count;
    const goalCount = getGoal(subCount);

    res.json({"t": new Date(),
      counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos],
      user: [channelName, channelLogo, channelBanner],
      value: [["Views", "Views (EST)"],["Goal", `Views to ${abbreviateNumber(getGoalText(subCount))}`],["Views", "Views (API)"],["Likes", "Likes (API)"],["Dislikes", "Dislikes (API)"],["Comments", "Commments (API)"]]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

// API route to get YouTube live subscriber count
app.get("/api/instagram/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch data from the external API
    const response = await axios.get(
      `https://api-v2.nextcounts.com/api/instagram/user/${userId}`
    );
    const subCount = response.data.followers;
    const totalViews = response.data.posts;
    const apiSubCount = response.data.following;
    const channelLogo = response.data.avatar;
    const channelName = response.data.nickname;
    const channelBanner = response.data.userBanner;
    const goalCount = getGoal(subCount);

    res.json({"t": new Date(),
      counts: [subCount, goalCount, apiSubCount, totalViews],
      user: [channelName, channelLogo, channelBanner],
      value: [["Followers", "Followers (IG)"],["Goal", `Followers to ${abbreviateNumber(getGoalText(subCount))}`],["Following", "Following (IG)"],["Posts", "Posts (IG)"]]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
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

    const { data: user1 } = await axios.get(
      `https://huntingstats378.onrender.com/api/youtube/channel/${ids.user1}`
    );

    const { data: mrbeast } = await axios.get(
      `https://mrbeast.subscribercount.app/data`
    );

    const { data: user2 } = await axios.get(
      `https://huntingstats378.onrender.com/api/instagram/user/${ids.user2}`
    );

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
