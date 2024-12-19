const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

// API route to get YouTube live subscriber count
app.get("/api/youtube-subcount/:channelId", async (req, res) => {
  const { channelId } = req.params;

  try {
    // Fetch data from the external API
    const response = await axios.get(
      `https://livecounts.xyz/api/youtube-live-subscriber-count/live/${channelId}`
    );
    const respons2e = await axios.get(
      `https://backend.mixerno.space/api/youtube/estv3/${channelId}`
    );
    const subCount = response.data.counts[0];
    const totalViews = response.data.counts[1];
    const apiViews = respons2e.data.items[0].statistics.viewCountAPI;
    const apiSubCount = respons2e.data.items[0].statistics.subscriberCountAPI;
    const videos = respons2e.data.items[0].statistics.videoCount;
    const channelLogo = respons2e.data.items[0].snippet.thumbnails.default.url;
    const channelName = respons2e.data.items[0].snippet.title;
    const channelBanner = respons2e.data.items[0].brandingSettings.image;

    res.json({
      stats: { subCount, totalViews, apiSubCount, videos, apiViews },
      info: { channelLogo, channelName, channelBanner },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch subscriber count" });
  }
});

app.get("/api/youtube-subcount/studio/:channelId", async (req, res) => {
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

app.get("/api/mrbeast/youtube-subcount/", async (req, res) => {
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
