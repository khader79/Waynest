export const STORAGE_KEYS = {
  authToken: "auth_token",
  authUser: "auth_user",
  deviceFingerprint: "device_fingerprint",
  pendingLoginCredentials: "pending_login_credentials",
  pendingAuthRedirect: "pending_auth_redirect",
  tripPlannerForm: "trip_planner_form",
  tripPlannerResult: "trip_planner_result",
  tripPlannerRemixDraft: "waynest_trip_remix_draft",
  guestTripToken: "waynest_guest_trip_token",
  /** Temporary payload stored when redirecting guests to login to finish an action */
  pendingTripGeneration: "pending_trip_generation",
  /** Action to perform after authentication (string) */
  pendingAuthAction: "pending_auth_action",
  /** Per-user flag: provider picked personal vs business this session (localStorage). */
  providerModeDonePrefix: "waynest_provider_mode_done_",
  /** Per-user: "personal" | "provider" — where the provider user is allowed to browse. */
  activeWorkspacePrefix: "waynest_active_workspace_",
};
