import { describe, expect, it, vi } from "vitest";
import { loadPublicBoard, SourceGatewayError } from "./sourceGateway";

describe("source gateway", () => {
  it("builds a fixed upstream request from a supported board URL", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ jobs: [], meta: { total: 0 } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));
    const result = await loadPublicBoard("https://job-boards.greenhouse.io/northstar", fetchMock as typeof fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://boards-api.greenhouse.io/v1/boards/northstar/jobs?content=true");
    expect(result.jobs).toEqual([]);
  });

  it("rejects unsupported hosts before making a network request", async () => {
    const fetchMock = vi.fn();
    await expect(loadPublicBoard("https://example.com/jobs", fetchMock as typeof fetch)).rejects.toMatchObject<Partial<SourceGatewayError>>({ status: 400, code: "invalid_source" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops oversized source responses", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200, headers: { "content-length": String(6 * 1024 * 1024) } }));
    await expect(loadPublicBoard("https://jobs.lever.co/northstar", fetchMock as typeof fetch)).rejects.toMatchObject<Partial<SourceGatewayError>>({ code: "source_too_large" });
  });
});
