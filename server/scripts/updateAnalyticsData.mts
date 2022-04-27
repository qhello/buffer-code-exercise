import { URL } from "url";
import { JSONFile } from "lowdb";
import lodash from "lodash";
import axios from "axios";
import { Data, LowWithLodash } from "../types.mjs";

// Set up database
const pathToDb = new URL("../../../database/db.json", import.meta.url).pathname;
const adapter = new JSONFile<Data>(pathToDb);
const db = new LowWithLodash(adapter);
await db.read();

console.log("Updating analytics data...");

// Create a map between our tweet IDs and their corresponding update id
const tweetIdToUpdateId = db.chain
  .get("updates")
  .value()
  .reduce((acc, { id, service_update_id }) => {
    acc[service_update_id] = id;
    return acc;
  }, {} as { [key: string]: string });

// Fetch updated analytics data for each tweet
const freshTweetAnalytics = await axios.get(
  "https://code-exercise-api.buffer.com/getTweets",
  {
    params: {
      ids: Object.keys(tweetIdToUpdateId).join(","),
    },
  }
);

// For each of our results from API, we will update the analytics data in our database
for (const tweetAnalytics of freshTweetAnalytics.data) {
  const {
    id,
    retweet_count: retweets,
    favorite_count: favorites,
    click_count: clicks,
  } = tweetAnalytics;

  // Determine the index of the corresponding "updates-analytics" element in our database
  const indexInDb = db.chain
    .get("updates-analytics")
    .findIndex(({ update_id }) => update_id === tweetIdToUpdateId[id])
    .value();

  // Quick trick here, didn't have time to make it better, sorry =)
  const dbData = db.data as Data;

  // Equivalent as using Object.assign (in our case)
  lodash.merge(dbData["updates-analytics"][indexInDb], {
    retweets,
    favorites,
    clicks,
  });
}

db.write();

console.log("Done updating analytics data.");
