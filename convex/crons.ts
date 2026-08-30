import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Autonomously re-crawl watched sources so changes surface without anyone clicking.
// Interval kept modest to conserve Context.dev credits; tighten for a live demo.
crons.interval("monitor watched sources", { minutes: 30 }, internal.monitor.sweep, {});

export default crons;
