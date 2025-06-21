// convex/contacts.js

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/* ──────────────────────────────────────────────────────────────────────────
   1. getAllContacts – Returns all 1‑to‑1 expense contacts and groups
   ──────────────────────────────────────────────────────────────────────── */
export const getAllContacts = query({
  handler: async (ctx) => {
    // Get the currently authenticated user (centralized logic)
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

    /* 
      ── Find all personal (1-to-1) expenses where the current user is the payer ──
      - Only select expenses where groupId is undefined (not a group expense)
      - This finds all expenses the user paid for someone else directly
    */
    const expensesYouPaid = await ctx.db
      .query("expenses")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", currentUser._id).eq("groupId", undefined)
      )
      .collect();

    /* 
      ── Find all personal (1-to-1) expenses where the current user is NOT the payer ──
      - Only select expenses where groupId is undefined (not a group expense)
      - Filter to expenses where:
        - Someone else paid (paidByUserId !== currentUser._id)
        - The current user is included in the splits (they owe or are owed)
      - This finds all expenses where the user participated but didn't pay
    */
    const expensesNotPaidByYou = (
      await ctx.db
        .query("expenses")
        .withIndex("by_group", (q) => q.eq("groupId", undefined)) // only 1‑to‑1
        .collect()
    ).filter(
      (e) =>
        e.paidByUserId !== currentUser._id &&
        e.splits.some((s) => s.userId === currentUser._id)
    );

    // Combine both sets to get all personal expenses involving the user
    const personalExpenses = [...expensesYouPaid, ...expensesNotPaidByYou];

    /* 
      ── Extract unique user IDs of all contacts from these expenses ──
      - For each expense:
        - If someone else paid, add their user ID
        - For each split, add the user ID if it's not the current user
      - This builds a set of all users the current user has had a 1-to-1 expense with
    */
    const contactIds = new Set();
    personalExpenses.forEach((exp) => {
      if (exp.paidByUserId !== currentUser._id)
        contactIds.add(exp.paidByUserId);

      exp.splits.forEach((s) => {
        if (s.userId !== currentUser._id) contactIds.add(s.userId);
      });
    });

    /* 
      ── Fetch user documents for all contact IDs ──
      - For each unique contact ID, fetch the user document from the database
      - Return only users that exist (filter out nulls)
      - Format each user with relevant fields for the frontend
    */
    const contactUsers = await Promise.all(
      [...contactIds].map(async (id) => {
        const u = await ctx.db.get(id);
        return u
          ? {
              id: u._id,
              name: u.name,
              email: u.email,
              imageUrl: u.imageUrl,
              type: "user",
            }
          : null;
      })
    );

    /* 
      ── Find all groups the current user is a member of ──
      - Query all groups, filter to those where the user is a member
      - Map each group to a summary object for the frontend
    */
    const userGroups = (await ctx.db.query("groups").collect())
      .filter((g) => g.members.some((m) => m.userId === currentUser._id))
      .map((g) => ({
        id: g._id,
        name: g.name,
        description: g.description,
        memberCount: g.members.length,
        type: "group",
      }));

    // Sort users and groups alphabetically by name for UI consistency
    contactUsers.sort((a, b) => a?.name.localeCompare(b?.name));
    userGroups.sort((a, b) => a.name.localeCompare(b.name));

    // Return both users and groups as contacts
    return { users: contactUsers.filter(Boolean), groups: userGroups };
  },
});

/* ──────────────────────────────────────────────────────────────────────────
   2. createGroup – Create a new group with members
   ──────────────────────────────────────────────────────────────────────── */
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    members: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get the currently authenticated user (centralized logic)
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

    // Validate group name is not empty
    if (!args.name.trim()) throw new Error("Group name cannot be empty");

    // Ensure all members are unique and include the creator
    const uniqueMembers = new Set(args.members);
    uniqueMembers.add(currentUser._id); // ensure creator is a member

    // Validate that all member user IDs exist in the database
    for (const id of uniqueMembers) {
      if (!(await ctx.db.get(id)))
        throw new Error(`User with ID ${id} not found`);
    }

    // Insert the new group into the database with member info
    return await ctx.db.insert("groups", {
      name: args.name.trim(),
      description: args.description?.trim() ?? "",
      createdBy: currentUser._id,
      members: [...uniqueMembers].map((id) => ({
        userId: id,
        role: id === currentUser._id ? "admin" : "member", // creator is admin
        joinedAt: Date.now(),
      })),
    });
  },
});