const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

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

    res.json({
      stats: { subCount, totalViews, apiSubCount, videos, apiViews },
      info: { channelLogo, channelName, channelBanner },
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
    const response = await fetch(
      `https://cors.stats100.xyz/https://studio.nia-statistics.com/api/channel/${channelId}`
    );
    const respons2e = await axios.get(
      `https://backend.mixerno.space/api/youtube/estv3/${channelId}`
    );
    const info = await response.json();
    const subCount = info.channels.counts[2].count;
    const viewCount = info.channels.counts[1].count;
    const apiSubCount = respons2e.data.items[0].statistics.subscriberCountAPI;
    const videos = respons2e.data.items[0].statistics.videoCount;
    const apiViews = respons2e.data.items[0].statistics.viewCountAPI;
    const channelLogo = info.currentChannels.image;
    const channelName = respons2e.data.items[0].snippet.title;
    const channelBanner = respons2e.data.items[0].brandingSettings.image;

    res.json({
      stats: { subCount, viewCount, apiSubCount, videos, apiViews },
      item: { channelLogo, channelName, channelBanner },
    });
  } catch (error) {
    console.error(error);
    res.status(200).json({ success: "Not in studio." });
  }
});

app.get("/api/youtube/channel/mrbeast", async (req, res) => {
  try {
    // Fetch data from the external API
    const response = await axios.get(`https://mrb.toasted.dev/count`);
    const respons2e = await axios.get(
      `https://backend.mixerno.space/api/youtube/estv3/UCX6OQ3DkcsbYNE6H8uQQuVA`
    );
    const subCount = response.data.mrbeastEst;
    const vsCount = response.data.mrbeast;
    const vsUpdateTime = response.data.time;
    const viewCount = respons2e.data.items[0].statistics.viewCount;
    const apiSubCount = respons2e.data.items[0].statistics.subscriberCountAPI;
    const videos = respons2e.data.items[0].statistics.videoCount;
    const apiViews = respons2e.data.items[0].statistics.viewCountAPI;
    const channelLogo = respons2e.data.items[0].brandingSettings.image;
    const channelName = respons2e.data.items[0].snippet.title;
    const channelBanner = respons2e.data.items[0].brandingSettings.image;

    res.json({
      stats: {
        subCount,
        viewCount,
        apiSubCount,
        videos,
        apiViews,
        vsCount,
        vsUpdateTime,
      },
      item: { channelLogo, channelName, channelBanner },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch subscriber count" });
  }
});

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
