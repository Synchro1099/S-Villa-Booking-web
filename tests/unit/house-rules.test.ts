import { describe, expect, it } from "vitest";
import { CARETAKER_LATER, houseRulesText, renderHouseRules, type HouseRulesContext, type RuleLine } from "@/lib/house-rules";
import { arrivalSettingsSchema, createBookingSchema, houseRulesSchema } from "@/lib/validation/schemas";

const ctx: HouseRulesContext = {
  directionsUrl: "https://maps.app.goo.gl/abc123",
  messengerUrl: "https://m.me/61594689538408",
  maxGuests: 6,
  caretaker: null,
};
const caretaker = { name: "Nena", mobile: "0917 123 4567", viber: "" };

/** A line as the plain text a reader sees. */
const plain = (line: RuleLine) => line.map((s) => s.text).join("");

describe("house rules: tags", () => {
  it("fills {directions} and {messenger} with links", () => {
    const [line] = renderHouseRules("**Directions:** {directions} or ask on {messenger}.", ctx);
    expect(line).toContainEqual({ kind: "link", text: "Open in Google Maps", href: "https://maps.app.goo.gl/abc123" });
    expect(line).toContainEqual({ kind: "link", text: "Messenger", href: "https://m.me/61594689538408" });
    expect(plain(line)).toBe("Directions: Open in Google Maps or ask on Messenger.");
  });

  it("hides the directions line until a real link is set", () => {
    expect(renderHouseRules("**Directions:** {directions}", { ...ctx, directionsUrl: "" })).toEqual([]);
    expect(renderHouseRules("**Directions:** {directions}", { ...ctx, directionsUrl: "https://maps.google.com/" })).toEqual([]);
  });

  it("keeps the valid-ID line without a Messenger link, as plain text", () => {
    const [line] = renderHouseRules("Send one valid ID on {messenger}.", { ...ctx, messengerUrl: "" });
    expect(line).toEqual([
      { kind: "text", text: "Send one valid ID on " },
      { kind: "text", text: "Messenger" },
      { kind: "text", text: "." },
    ]);
  });

  it("fills {max_guests} from the booking rule, bold inside a bold run", () => {
    const [line] = renderHouseRules("**Up to {max_guests} guests per booking.** Extra guests can be arranged.", { ...ctx, maxGuests: 8 });
    expect(line.slice(0, 3)).toEqual([
      { kind: "text", text: "Up to ", bold: true },
      { kind: "text", text: "8", bold: true },
      { kind: "text", text: " guests per booking.", bold: true },
    ]);
    expect(plain(line)).toBe("Up to 8 guests per booking. Extra guests can be arranged.");
  });

  it("matches tags in any case and leaves unknown braces as typed", () => {
    const [line] = renderHouseRules("{MAX_GUESTS} max, {not_a_tag}", ctx);
    expect(plain(line)).toBe("6 max, {not_a_tag}");
  });
});

describe("house rules: caretaker privacy", () => {
  const line = "**When you arrive, call our caretaker.** {caretaker}";

  it("never shows the caretaker before confirmation, only a note", () => {
    const [out] = renderHouseRules(line, ctx);
    expect(plain(out)).toBe(`When you arrive, call our caretaker. ${CARETAKER_LATER}`);
    expect(out.some((s) => s.kind === "tel")).toBe(false);
  });

  it("shows name and a tap-to-call number once confirmed (blank Viber = same number)", () => {
    const [out] = renderHouseRules(line, { ...ctx, caretaker });
    expect(plain(out)).toBe("When you arrive, call our caretaker. Nena: 0917 123 4567 (mobile and Viber).");
    expect(out).toContainEqual({ kind: "tel", text: "0917 123 4567", number: "09171234567" });
  });

  it("lists a different Viber number separately", () => {
    const [out] = renderHouseRules(line, { ...ctx, caretaker: { ...caretaker, viber: "0918 765 4321" } });
    expect(plain(out)).toBe("When you arrive, call our caretaker. Nena: 0917 123 4567 (mobile), 0918 765 4321 (Viber).");
  });

  it("treats a Viber number equal to the mobile as the same number", () => {
    const [out] = renderHouseRules(line, { ...ctx, caretaker: { ...caretaker, viber: "09171234567" } });
    expect(plain(out)).toContain("(mobile and Viber)");
  });

  it("hides the line on a confirmed booking when no caretaker number is set yet", () => {
    expect(renderHouseRules(line, { ...ctx, caretaker: { name: "Nena", mobile: "", viber: "" } })).toEqual([]);
  });
});

describe("house rules: text handling", () => {
  it("skips blank lines, trims, and accepts Windows line endings", () => {
    const lines = renderHouseRules("  First rule.  \r\n\r\n\nSecond rule.\r\n", ctx);
    expect(lines.map(plain)).toEqual(["First rule.", "Second rule."]);
  });

  it("keeps an unmatched ** as typed instead of bolding the rest of the line", () => {
    const [line] = renderHouseRules("Bring **water and towels.", ctx);
    expect(plain(line)).toBe("Bring **water and towels.");
    expect(line.some((s) => s.kind === "text" && s.bold)).toBe(false);
  });

  it("is empty when the owner clears the house rules", () => {
    expect(renderHouseRules("", ctx)).toEqual([]);
    expect(renderHouseRules("\n  \n", ctx)).toEqual([]);
  });

  it("renders plain text for emails with bullet points and visible links", () => {
    const lines = renderHouseRules("**Directions:** {directions}\nCCTV covers the venue.", ctx);
    expect(houseRulesText(lines)).toBe("• Directions: Open in Google Maps (https://maps.app.goo.gl/abc123)\n• CCTV covers the venue.");
  });
});

describe("house rules: form validation", () => {
  it("the booking form sends acceptedRules; it defaults to not ticked", () => {
    const base = {
      date: "2026-10-10",
      startTime: "10:00",
      durationHours: 1,
      guestCount: 2,
      serviceIds: ["00000000-0000-4000-8000-000000000000"],
      paymentMethod: "GCASH",
      fullName: "Maria Santos",
      email: "maria@example.com",
      mobile: "09171234567",
    };
    expect(createBookingSchema.parse(base).acceptedRules).toBe(false);
    expect(createBookingSchema.parse({ ...base, acceptedRules: true }).acceptedRules).toBe(true);
  });

  it("caretaker numbers may be blank but not too short; the Maps link must be https", () => {
    const ok = { caretakerName: "Nena", caretakerMobile: "0917 123 4567", caretakerViber: "", directionsUrl: "https://maps.app.goo.gl/x" };
    expect(arrivalSettingsSchema.safeParse(ok).success).toBe(true);
    expect(arrivalSettingsSchema.safeParse({ ...ok, caretakerMobile: "" }).success).toBe(true);
    expect(arrivalSettingsSchema.safeParse({ ...ok, caretakerMobile: "0917" }).success).toBe(false);
    expect(arrivalSettingsSchema.safeParse({ ...ok, directionsUrl: "maps.app.goo.gl/x" }).success).toBe(false);
  });

  it("house rules can be emptied but not exceed 4,000 characters", () => {
    expect(houseRulesSchema.safeParse({ houseRules: "" }).success).toBe(true);
    expect(houseRulesSchema.safeParse({ houseRules: "x".repeat(4001) }).success).toBe(false);
  });
});
