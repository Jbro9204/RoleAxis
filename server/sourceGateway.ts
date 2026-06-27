import { normalizeGreenhouse, normalizeLever, parseSupportedBoardUrl } from "./sourceAdapters.js";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 9_000;

export class SourceGatewayError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 502, code = "source_unavailable") {
    super(message);
    this.name = "SourceGatewayError";
    this.status = status;
    this.code = code;
  }
}

async function readBoundedJson(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) throw new SourceGatewayError("The public board returned more data than can be reviewed safely.", 502, "source_too_large");
  if (!response.body) throw new SourceGatewayError("The public board returned an empty response.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new SourceGatewayError("The public board returned more data than can be reviewed safely.", 502, "source_too_large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new SourceGatewayError("The public board returned an unreadable response.", 502, "invalid_source_response");
  }
}

export async function loadPublicBoard(sourceUrl: string, fetchImplementation: typeof fetch = fetch) {
  let board;
  try {
    board = parseSupportedBoardUrl(sourceUrl);
  } catch (error) {
    throw new SourceGatewayError(error instanceof Error ? error.message : "The public careers URL is invalid.", 400, "invalid_source");
  }

  const upstreamUrl = board.adapter === "greenhouse"
    ? `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.identifier)}/jobs?content=true`
    : `https://api.${board.region === "eu" ? "eu." : ""}lever.co/v0/postings/${encodeURIComponent(board.identifier)}?mode=json&limit=251`;

  let response: Response;
  try {
    response = await fetchImplementation(upstreamUrl, {
      headers: { Accept: "application/json", "User-Agent": "RoleAxis/1.0 job-discovery" },
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
  } catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    throw new SourceGatewayError(
      timedOut ? "The public board did not respond in time. Nothing in the campaign was changed." : "The public board could not be reached. Nothing in the campaign was changed.",
      502,
      timedOut ? "source_timeout" : "source_unavailable"
    );
  }

  if (!response.ok) {
    if (response.status === 404) throw new SourceGatewayError("No public board was found at that address. Check the careers URL and try again.", 404, "source_not_found");
    if (response.status === 429) throw new SourceGatewayError("The public board is limiting requests. Wait a moment before running it again.", 429, "source_rate_limited");
    throw new SourceGatewayError("The public board is temporarily unavailable. Nothing in the campaign was changed.");
  }

  const payload = await readBoundedJson(response);
  const normalized = board.adapter === "greenhouse"
    ? normalizeGreenhouse(payload as Parameters<typeof normalizeGreenhouse>[0], board)
    : normalizeLever(payload as Parameters<typeof normalizeLever>[0], board);
  return { ...normalized, fetchedAt: new Date().toISOString() };
}
