"use client";

import { useEffect } from "react";
import { clearDeletedAccountDrafts } from "./clearDrafts";

/** Rendered on the farewell page after an account deletion: clears that account's drafts. */
export function ForgetDeletedDrafts() {
  useEffect(() => clearDeletedAccountDrafts(), []);
  return null;
}
