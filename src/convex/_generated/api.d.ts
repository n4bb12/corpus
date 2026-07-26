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
import type * as chat from "../chat.js";
import type * as cleanup from "../cleanup.js";
import type * as emails_send from "../emails/send.js";
import type * as http from "../http.js";
import type * as ingestion from "../ingestion.js";
import type * as ingestionHelpers from "../ingestionHelpers.js";
import type * as lib_ownership from "../lib/ownership.js";
import type * as lib_sourceBoundaries from "../lib/sourceBoundaries.js";
import type * as notebooks from "../notebooks.js";
import type * as retrieval from "../retrieval.js";
import type * as retrievalHelpers from "../retrievalHelpers.js";
import type * as sourceRevisions from "../sourceRevisions.js";
import type * as sources from "../sources.js";
import type * as titles from "../titles.js";
import type * as titlesHelpers from "../titlesHelpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  chat: typeof chat;
  cleanup: typeof cleanup;
  "emails/send": typeof emails_send;
  http: typeof http;
  ingestion: typeof ingestion;
  ingestionHelpers: typeof ingestionHelpers;
  "lib/ownership": typeof lib_ownership;
  "lib/sourceBoundaries": typeof lib_sourceBoundaries;
  notebooks: typeof notebooks;
  retrieval: typeof retrieval;
  retrievalHelpers: typeof retrievalHelpers;
  sourceRevisions: typeof sourceRevisions;
  sources: typeof sources;
  titles: typeof titles;
  titlesHelpers: typeof titlesHelpers;
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

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
