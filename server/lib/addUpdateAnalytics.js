export default (db) => (update) => {
  const analytics = db.lodash
    .get("updates-analytics")
    .find({ update_id: update.id })
    .pick(["retweets", "favorites", "clicks"])
    .value();

  return {
    ...update,
    statistics: analytics ?? {},
  };
};
