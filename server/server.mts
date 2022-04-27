import express, { NextFunction, Request, Response } from "express";
import serveStatic from "serve-static";
import morgan from "morgan";
import { URL } from "url";

import { JSONFile } from "lowdb";

import { Data, LowWithLodash } from "./types.mjs";
import addUpdateAnalytics from "./lib/addUpdateAnalytics.mjs";
import {
  getDayStartFromUnixTimestamp,
  getTimestampSeriesArray,
} from "./lib/dates.mjs";

const app = express();
const PORT = 8080;

// Set up database
const pathToDb = new URL("../../database/db.json", import.meta.url).pathname;
const adapter = new JSONFile<Data>(pathToDb);
const db = new LowWithLodash(adapter);
await db.read();

// Logger
app.use(morgan("dev"));

// Disable caching for API endpoints
app.use("/api", (_, res, next) => {
  res.header("Cache-Control", "no-cache");
  next();
});

app.get("/api/getUpdates", (req, res) => {
  const skip = parseInt((req.query.skip as string) ?? 0);

  const updates = db.chain
    .get("updates")
    .orderBy("sent_at", "desc")
    .slice(skip, skip + 10)
    .map(addUpdateAnalytics(db))
    .value();

  res.json(updates);
});

app.get("/api/getAnalyticsTimeseries", (_req, res) => {
  // Fetch all our updates, group them by day
  const updatesByDay = db.chain
    .get("updates")
    .map(addUpdateAnalytics(db))
    .groupBy(({ sent_at }) => getDayStartFromUnixTimestamp(sent_at))
    .value();

  // Get all our timestamps, and sort them (just in case)
  const sortedListOfDays = Object.keys(updatesByDay)
    .map((i) => parseInt(i))
    .sort();

  if (!sortedListOfDays.length) {
    res.json([]);
    return;
  }

  // Get exhaustive list of days between our boundaries
  const listOfDaysToReturn = getTimestampSeriesArray(
    sortedListOfDays[0],
    sortedListOfDays[sortedListOfDays.length - 1]
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
const pathToStatic = new URL("../../public", import.meta.url).pathname;
app.use(
  serveStatic(pathToStatic, {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-cache");
    },
  })
);

app.use(
  (
    err: { code: string },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    // Handle missing file in public dir as a 404
    if (err.code === "ENOENT") {
      return res.status(404).send("404 - Page not found");
    }
    console.log(err);
    res.status(500).send(err);
  }
);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
