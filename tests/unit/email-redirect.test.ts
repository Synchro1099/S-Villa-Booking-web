import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { RedirectEmailProvider } = await import("@/lib/notifications/providers");

describe("RedirectEmailProvider", () => {
  it("sends to the test inbox and names the real recipient", async () => {
    const send = vi.fn().mockResolvedValue({ status: "SENT" });
    const provider = new RedirectEmailProvider({ send }, "me@test.dev");

    const result = await provider.send({
      to: "guest@example.com",
      subject: "Booking received",
      text: "Hello",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({ status: "SENT" });
    const sent = send.mock.calls[0][0];
    expect(sent.to).toBe("me@test.dev");
    expect(sent.subject).toBe("[Test → guest@example.com] Booking received");
    expect(sent.text).toContain("meant for guest@example.com");
    expect(sent.html).toContain("<p>Hello</p>");
  });

  it("escapes the recipient in the HTML note", async () => {
    const send = vi.fn().mockResolvedValue({ status: "SENT" });
    await new RedirectEmailProvider({ send }, "me@test.dev").send({ to: "<b>x</b>", subject: "s", text: "t", html: "" });
    expect(send.mock.calls[0][0].html).not.toContain("<b>");
  });
});
