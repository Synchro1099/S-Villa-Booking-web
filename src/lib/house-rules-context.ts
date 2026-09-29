import type { Settings } from "@/types";
import { renderHouseRules, type Caretaker, type RuleLine } from "@/lib/house-rules";

type RulesSettings = Pick<Settings, "house_rules" | "directions_url" | "messenger_url" | "max_guests">;

/** House rules as shown before a booking is confirmed (Step 6): no caretaker details. */
export function publicHouseRules(s: RulesSettings): RuleLine[] {
  return confirmedHouseRules(s, null);
}

/** House rules for a confirmed booking (status page and "Confirmed" email), with the caretaker's details. */
export function confirmedHouseRules(s: RulesSettings, caretaker: Caretaker | null): RuleLine[] {
  return renderHouseRules(s.house_rules ?? "", {
    directionsUrl: s.directions_url ?? "",
    messengerUrl: s.messenger_url ?? "",
    maxGuests: s.max_guests,
    caretaker,
  });
}
