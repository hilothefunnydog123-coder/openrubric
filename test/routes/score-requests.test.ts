import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeSupabase } from "../helpers/supabase-mock";

const h = vi.hoisted(() => ({
  state: {
    configured: true,
    service: null as FakeSupabase | null,
    user: null as { id: string; email: string } | null,
    isOwner: false,
    ownerEmails: [] as string[],
    verified: false,
    breakdown: null as unknown,
  },
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => h.state.configured,
  getSupabaseServiceClient: async () => h.state.service,
  getSupabaseServerClient: async () =>
    h.state.user ? { auth: { getUser: async () => ({ data: { user: h.state.user } }) } } : null,
}));
vi.mock("@/lib/live-data", () => ({
  isHackathonOwner: async () => h.state.isOwner,
  listOwnerEmailsForHackathon: async () => h.state.ownerEmails,
  emailIsParticipantOnSubmission: async () => h.state.verified,
  getScoreBreakdownForSubmission: async () => h.state.breakdown,
}));
vi.mock("@/lib/mailer", () => ({
  isMailerConfigured: () => false,
  sendHostNotificationEmail: async () => ({ sent: false, demo: true }),
}));

import { POST as CREATE, GET as LIST } from "@/app/api/score-requests/route";
import { POST as DECIDE } from "@/app/api/score-requests/[id]/decide/route";
import { GET as MINE } from "@/app/api/score-requests/mine/route";

const HACK = "11111111-1111-1111-1111-111111111111";
const SUB = "22222222-2222-2222-2222-222222222222";
const REQ = "33333333-3333-3333-3333-333333333333";
const USER = "44444444-4444-4444-4444-444444444444";

function jsonReq(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  h.state.configured = true;
  h.state.service = null;
  h.state.user = null;
  h.state.isOwner = false;
  h.state.ownerEmails = [];
  h.state.verified = false;
  h.state.breakdown = null;
});

describe("POST /api/score-requests (create)", () => {
  it("rejects an invalid payload with 400", async () => {
    const res = await CREATE(jsonReq("https://app/api/score-requests", {}));
    expect(res.status).toBe(400);
  });

  it("acknowledges without persisting in demo mode (non-UUID ids)", async () => {
    const res = await CREATE(
      jsonReq("https://app/api/score-requests", { hackathon_id: "demo", submission_id: "demo" }),
    );
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, demo: true, status: "pending" });
  });

  it("401 when no session email", async () => {
    h.state.service = createFakeSupabase();
    h.state.user = null;
    const res = await CREATE(
      jsonReq("https://app/api/score-requests", { hackathon_id: HACK, submission_id: SUB }),
    );
    expect(res.status).toBe(401);
  });

  it("creates a pending request for a signed-in participant", async () => {
    h.state.user = { id: USER, email: "team@example.com" };
    h.state.verified = true;
    h.state.service = createFakeSupabase({
      "score_requests:select": {
        data: [{ id: REQ, submission_id: SUB, requester_email: "team@example.com", status: "pending" }],
      },
    });
    const res = await CREATE(
      jsonReq("https://app/api/score-requests", { hackathon_id: HACK, submission_id: SUB }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, status: "pending", verified: true });
    // an insert was attempted
    expect(h.state.service.calls.some((c) => c.table === "score_requests" && c.op === "insert")).toBe(true);
  });

  it("a re-request keeps an existing decision (no reset, no re-notify)", async () => {
    h.state.user = { id: USER, email: "team@example.com" };
    h.state.service = createFakeSupabase({
      // duplicate → insert errors; the existing approved row is returned unchanged
      "score_requests:insert": { error: { message: "duplicate key value violates unique constraint" } },
      "score_requests:select": {
        data: [{ id: REQ, status: "approved", detail_level: "score_only", requester_email: "team@example.com" }],
      },
    });
    const res = await CREATE(
      jsonReq("https://app/api/score-requests", { hackathon_id: HACK, submission_id: SUB }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("approved"); // not reset to pending
  });
});

describe("GET /api/score-requests (owner queue)", () => {
  it("403 for a non-owner", async () => {
    h.state.user = { id: USER, email: "x@example.com" };
    h.state.isOwner = false;
    h.state.service = createFakeSupabase();
    const res = await LIST(new Request(`https://app/api/score-requests?hackathon_id=${HACK}`));
    expect(res.status).toBe(403);
  });

  it("returns the queue for an owner", async () => {
    h.state.user = { id: USER, email: "owner@example.com" };
    h.state.isOwner = true;
    h.state.service = createFakeSupabase({
      "score_requests:select": { data: [{ id: REQ, status: "pending", requester_email: "team@example.com" }] },
    });
    const res = await LIST(new Request(`https://app/api/score-requests?hackathon_id=${HACK}`));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.requests).toHaveLength(1);
  });
});

describe("POST /api/score-requests/[id]/decide", () => {
  function withRequest() {
    return createFakeSupabase({
      "score_requests:select": {
        data: [{ id: REQ, hackathon_id: HACK, submission_id: SUB, requester_email: "team@example.com" }],
      },
      "score_requests:update": {
        data: [{ id: REQ, status: "approved", detail_level: "score_rubric" }],
      },
    });
  }
  const params = { params: Promise.resolve({ id: REQ }) };

  it("403 when the decider is not an owner", async () => {
    h.state.user = { id: USER, email: "x@example.com" };
    h.state.isOwner = false;
    h.state.service = withRequest();
    const res = await DECIDE(
      jsonReq(`https://app/api/score-requests/${REQ}/decide`, { status: "approved", detail_level: "score_rubric" }),
      params,
    );
    expect(res.status).toBe(403);
  });

  it("approves with a detail level for an owner", async () => {
    h.state.user = { id: USER, email: "owner@example.com" };
    h.state.isOwner = true;
    h.state.service = withRequest();
    const res = await DECIDE(
      jsonReq(`https://app/api/score-requests/${REQ}/decide`, { status: "approved", detail_level: "score_rubric" }),
      params,
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.request.status).toBe("approved");
    const upd = h.state.service.calls.find((c) => c.table === "score_requests" && c.op === "update")!;
    expect((upd.payload as any).detail_level).toBe("score_rubric");
    expect((upd.payload as any).decided_by).toBe(USER);
  });

  it("rejects an invalid status with 400", async () => {
    h.state.user = { id: USER, email: "owner@example.com" };
    h.state.isOwner = true;
    h.state.service = withRequest();
    const res = await DECIDE(
      jsonReq(`https://app/api/score-requests/${REQ}/decide`, { status: "maybe" }),
      params,
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/score-requests/mine (reveal gating)", () => {
  it("reveals nothing while pending", async () => {
    h.state.user = { id: USER, email: "team@example.com" };
    h.state.service = createFakeSupabase({
      "score_requests:select": { data: [{ status: "pending", detail_level: null }] },
    });
    const res = await MINE(new Request(`https://app/api/score-requests/mine?submission_id=${SUB}`));
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.score).toBeUndefined();
  });

  it("reveals the score only once approved", async () => {
    h.state.user = { id: USER, email: "team@example.com" };
    h.state.breakdown = { total: 87, max: 100, judgesDone: 2, judgesTotal: 2 };
    h.state.service = createFakeSupabase({
      "score_requests:select": { data: [{ status: "approved", detail_level: "score_only" }] },
    });
    const res = await MINE(new Request(`https://app/api/score-requests/mine?submission_id=${SUB}`));
    const body = await res.json();
    expect(body.status).toBe("approved");
    expect(body.score.total).toBe(87);
  });

  it("401 with no session", async () => {
    h.state.user = null;
    h.state.service = createFakeSupabase();
    const res = await MINE(new Request(`https://app/api/score-requests/mine?submission_id=${SUB}`));
    expect(res.status).toBe(401);
  });
});
