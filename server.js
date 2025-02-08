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

    res.json({t: new Date(),
      counts: [subCount, goalCount, apiSubCount, totalViews, apiViews, videos],
      user: [channelName, channelLogo, channelBanner],
      value: [["Subscribers", "Subscribers (EST)"],["Goal", `Subscribers to ${abbreviateNumber(getGoalText(subCount))}`],["Subscribers", "Subscribers (API)"],["Views", "Views (EST)"],["Views", "Views (API)"],["Videos", "Videos (API)"]]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch subscriber count" });
  }
});

app.get("/api/youtube/channel/:channelId/studio", async (req, res) => {
  const { channelId } = req.params;

  try {
    // Fetch data from the external API
    const response = await axios.get(
      `https://api-v2.nextcounts.com/api/youtube/channel/${channelId}`
    );
    const respons2e = await axios.get(
      `https://mixerno.space/api/youtube-channel-counter/user/${channelId}`
    );
    const info = await response.json();
    const subCount = info.subcount;
    const viewCount = respons2e.data.counts[3].count;
    const apiSubCount = respons2e.data.counts[2].count;
    const videos = respons2e.data.counts[5].count;
    const apiViews = respons2e.data.counts[4].count;
    const channelLogo = respons2e.data.user[1].count;
    const channelName = respons2e.data.user[0].count;
    const channelBanner = respons2e.data.user[2].count;
    const goalCount = getGoal(subCount);

    res.json({t: new Date(),
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
    res.status(500).send("Failed to fetch subscriber count");
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
    res.status(500).send("Failed to fetch information");
  }
});

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
