import { URL } from "url";
import { Low, JSONFileSync } from "lowdb";
import lodash from "lodash";
import axios from "axios";

// Set up database
const pathToDb = new URL("../database/db.json", import.meta.url).pathname;
const adapter = new JSONFileSync(pathToDb);
const db = new Low(adapter);
await db.read();

// Add lodash to the lowdb database
db.lodash = lodash.chain(db.data);

console.log("Updating analytics data...");

// Create a map between our tweet IDs and their corresponding update id
const tweetIdToUpdateId = db.lodash
  .get("updates")
  .value()
  .reduce((acc, { id, service_update_id }) => {
    acc[service_update_id] = id;
    return acc;
  }, {});

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
  const indexInDb = db.lodash
    .get("updates-analytics")
    .findIndex(({ update_id }) => update_id === tweetIdToUpdateId[id])
    .value();

  // Equivalent as using Object.assign (in our case)
  lodash.merge(db.data["updates-analytics"][indexInDb], {
    retweets,
    favorites,
    clicks,
  });
}

db.write();

console.log("Done updating analytics data.");
