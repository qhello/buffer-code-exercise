import express from "express";
import serveStatic from "serve-static";
import morgan from "morgan";
import path from "path";
import { URL } from "url";

import { Low, JSONFileSync } from "lowdb";
import lodash from "lodash";

import addUpdateAnalytics from "./lib/addUpdateAnalytics.js";

import {
  getDayStartFromUnixTimestamp,
  getTimestampSeriesArray,
} from "./lib/dates.js";

const app = express();
const PORT = 8080;

// Set up database
const pathToDb = new URL("./database/db.json", import.meta.url).pathname;
const adapter = new JSONFileSync(pathToDb);
const db = new Low(adapter);
await db.read();

// Add lodash to the lowdb database
db.lodash = lodash.chain(db.data);

// Logger
app.use(morgan("dev"));

// Disable caching for API endpoints
app.use("/api", (req, res, next) => {
  res.header("Cache-Control", "no-cache");
  next();
});

app.get("/api/getUpdates", (req, res) => {
  const updates = db.lodash
    .get("updates")
    .orderBy("sent_at", "desc")
    .slice(0, 10)
    .map(addUpdateAnalytics(db))
    .value();

  res.json(updates);
});

app.get("/api/getAnalyticsTimeseries", (req, res) => {
  // Fetch all our updates, group them by day
  const updatesByDay = db.lodash
    .get("updates")
    .map(addUpdateAnalytics(db))
    .groupBy(({ sent_at }) => getDayStartFromUnixTimestamp(sent_at))
    .value();

  // Get all our timestamps, and sort them (just in case)
  const sortedListOfDays = Object.keys(updatesByDay)
    .map((i) => parseInt(i))
    .sort();

  // Get exhaustive list of days between our boundaries
  const listOfDaysToReturn = getTimestampSeriesArray(
    lodash.first(sortedListOfDays),
    lodash.last(sortedListOfDays)
  );

  // Reduce our updates statistics to a timeseries
  const result = listOfDaysToReturn.map((timestamp) => {
    const updates = updatesByDay[timestamp.toString()] ?? [];

    const statisticsAggregation = updates.reduce(
      (acc, { statistics }) => ({
        retweets: acc.retweets + statistics.retweets,
        favorites: acc.favorites + statistics.favorites,
        clicks: acc.clicks + statistics.clicks,
      }),
      {
        retweets: 0,
        favorites: 0,
        clicks: 0,
      }
    );

    return {
      timestamp,
      ...statisticsAggregation,
    };
  });

  res.json(result);
});

// Serve static assets in the /public directory
const pathToStatic = new URL("../public", import.meta.url).pathname;
app.use(
  serveStatic(pathToStatic, {
    cacheControl: "no-cache",
  })
);

app.use((err, req, res, next) => {
  // Handle missing file in public dir as a 404
  if (err.code === "ENOENT") {
    return res.status(404).send("404 - Page not found");
  }
  console.log(err);
  res.status(500).send(err);
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
