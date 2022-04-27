import { Data, LowWithLodash, Update } from "../types.mjs";

export default (db: LowWithLodash<Data>) => (update: Update) => {
  const analytics = db.chain
    .get("updates-analytics")
    .find({ update_id: update.id })
    .pick(["retweets", "favorites", "clicks"])
    .value();

  return {
    ...update,
    statistics: analytics ?? {},
  };
};
