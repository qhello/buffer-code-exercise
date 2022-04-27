import lodash from "lodash";
import { Low } from "lowdb";

export type Update = {
  id: string;
  sent_at: number;
  service_update_id: string;
};

export type UpdateAnalytics = {
  update_id: string;
  retweets: number;
  favorites: number;
  clicks: number;
};

export type Data = {
  updates: Update[];
  "updates-analytics": UpdateAnalytics[];
};

// Extend Low class with a new `chain` field
export class LowWithLodash<T> extends Low<T> {
  chain: lodash.ExpChain<this["data"]> = lodash.chain(this).get("data");
}
