import { cronJobs } from "convex/server";

// All recurring tasks disabled. (Previously: a 30-min monitor sweep that
// re-crawled watched sources, and a 4-min keep-warm ping.) Re-enable by
// registering crons here again — see git history.
const crons = cronJobs();

export default crons;
