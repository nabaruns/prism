/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as graph from "../graph.js";
import type * as http from "../http.js";
import type * as lib_context from "../lib/context.js";
import type * as lib_lensSchemas from "../lib/lensSchemas.js";
import type * as monitor from "../monitor.js";
import type * as seed from "../seed.js";
import type * as slack from "../slack.js";
import type * as sources from "../sources.js";
import type * as telegram from "../telegram.js";
import type * as views from "../views.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  files: typeof files;
  graph: typeof graph;
  http: typeof http;
  "lib/context": typeof lib_context;
  "lib/lensSchemas": typeof lib_lensSchemas;
  monitor: typeof monitor;
  seed: typeof seed;
  slack: typeof slack;
  sources: typeof sources;
  telegram: typeof telegram;
  views: typeof views;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
