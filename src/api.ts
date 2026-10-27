// the admin api of letekryss-generator. ?api=http://localhost:8999 in the url
// points the picker at a local server instead
export const API_URL =
  new URLSearchParams(window.location.search).get("api") ??
  "https://letekryss-generator-production.up.railway.app";

export const STATUSES = [
  "unchecked",
  "approved",
  "unsuitable",
  "maybe",
  "discarded",
  "egennavn",
  "abbreviation",
  "confirmed",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  unchecked:    "uklassifisert",
  approved:     "fasitord",
  unsuitable:   "ikke fasitverdig",
  maybe:        "kanskje",
  discarded:    "ikke et ord",
  egennavn:     "egennavn",
  abbreviation: "forkortelse",
  confirmed:    "bekreftet (gammel)",
};

export type Word = { id: number; word: string; checked: Status };

export type Review = {
  id:          number;
  word_id:     number;
  word:        string;
  from_status: Status;
  to_status:   Status;
  status_now:  Status;
  created_at:  string;
};

export type Filter = {
  status:     Status;
  prefix:     string;
  min_length: number;
  max_length: number;
  // only the words nobody has decided on in the picker
  unreviewed: boolean;
};

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const call = async <T>(token: string, path: string, body?: unknown): Promise<T> => {
  const response = await fetch(`${API_URL}/admin${path}`, {
    method:  body === undefined ? "GET" : "POST",
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, json.error ?? response.statusText);

  return json as T;
};

export const fetch_words = (token: string, filter: Filter, after_id: number, limit = 200) => {
  const query = new URLSearchParams({
    status:     filter.status,
    prefix:     filter.prefix,
    min_length: String(filter.min_length),
    max_length: String(filter.max_length),
    unreviewed: String(filter.unreviewed),
    after_id:   String(after_id),
    limit:      String(limit),
  });

  return call<{ words: Word[]; remaining: number }>(token, `/words?${query}`);
};

export const fetch_stats = (token: string) => call<Partial<Record<Status, number>>>(token, "/stats");

export const fetch_reviews = (token: string, limit = 40) => call<{ reviews: Review[] }>(token, `/reviews?limit=${limit}`);

export type ReviewRequest = { id: number; from_status: Status; to_status: Status };

export const post_reviews = (token: string, reviews: ReviewRequest[]) => call<{ words: Word[] }>(token, "/reviews", { reviews });
