export function updateStreak(): { streak: number; isNewDay: boolean } {
  if (typeof window === "undefined") return { streak: 0, isNewDay: false };

  const today = new Date().toISOString().split("T")[0];
  const lastActive = localStorage.getItem("signux_last_active");
  let streak = parseInt(localStorage.getItem("signux_streak") || "0");

  if (lastActive === today) {
    return { streak, isNewDay: false };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (lastActive === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }

  localStorage.setItem("signux_last_active", today);
  localStorage.setItem("signux_streak", String(streak));
  return { streak, isNewDay: true };
}
