import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The lenses Prism can run against a source.
export const LENS = v.union(
  v.literal("watch"),
  v.literal("audit"),
  v.literal("research"),
  v.literal("compare"),
  v.literal("hunt"),
);

export default defineSchema({
  ...authTables,

  // A URL/domain Prism is looking at, under a given lens. Owned by a user.
  sources: defineTable({
    userId: v.optional(v.id("users")),
    url: v.string(),
    domain: v.string(),
    title: v.optional(v.string()),
    lens: LENS,
    status: v.union(
      v.literal("pending"),
      v.literal("crawling"),
      v.literal("ready"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
    telegramChatId: v.optional(v.number()), // chat that requested this source (push result back)
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  // Links a Telegram chat to a Prism user account.
  telegramLinks: defineTable({ chatId: v.number(), userId: v.id("users") })
    .index("by_chat", ["chatId"])
    .index("by_user", ["userId"]),

  // Short-lived codes for the "Connect Telegram" deep link.
  linkCodes: defineTable({ code: v.string(), userId: v.id("users"), createdAt: v.number() })
    .index("by_code", ["code"]),

  // A point-in-time crawl of a source (raw markdown + any structured extraction).
  snapshots: defineTable({
    sourceId: v.id("sources"),
    contentHash: v.string(),
    markdown: v.optional(v.string()),
    extracted: v.optional(v.any()),
    crawledAt: v.number(),
  }).index("by_source", ["sourceId"]),

  // A detected change between two snapshots (Watch / Compare).
  changes: defineTable({
    sourceId: v.id("sources"),
    toSnapshotId: v.id("snapshots"),
    summary: v.string(),
    whyItMatters: v.optional(v.string()),
    severity: v.union(
      v.literal("info"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
    ),
    createdAt: v.number(),
  }).index("by_source", ["sourceId"]),

  // Lens-level insight (a memo, a compare summary, etc.).
  analyses: defineTable({
    sourceId: v.id("sources"),
    lens: LENS,
    content: v.any(),
    createdAt: v.number(),
  }).index("by_source", ["sourceId"]),

  // Individual rows: Audit issues, Hunt opportunities.
  findings: defineTable({
    sourceId: v.id("sources"),
    lens: LENS,
    type: v.string(),
    title: v.string(),
    detail: v.optional(v.string()),
    severity: v.optional(v.string()),
    url: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_source", ["sourceId"]),

  // ── Graph RAG (the "Ask" layer) ──────────────────────────────────────────
  // Entities extracted from any lens, deduped per user by canonical key.
  entities: defineTable({
    userId: v.optional(v.id("users")),
    key: v.string(), // canonical: `${type}:${slug}`
    type: v.string(), // company | product | price | person | doc | change | opportunity | topic
    name: v.string(),
    props: v.optional(v.any()),
    sourceIds: v.array(v.id("sources")),
    updatedAt: v.number(),
  })
    .index("by_user_key", ["userId", "key"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["userId"] }),

  // Relationships between entities (scoped per user).
  edges: defineTable({
    userId: v.optional(v.id("users")),
    fromKey: v.string(),
    toKey: v.string(),
    rel: v.string(),
    sourceId: v.optional(v.id("sources")),
    createdAt: v.number(),
  })
    .index("by_user_from", ["userId", "fromKey"])
    .index("by_user_to", ["userId", "toKey"]),
});
