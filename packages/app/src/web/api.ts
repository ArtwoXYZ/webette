/**
 * Typed client for the webette engine API, tunneled through the
 * Electrobun RPC bridge (the bun process proxies HTTP calls to
 * 127.0.0.1:<api port>).
 */

import type { ApiErrorCode } from "webette";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ApiErrorCode; error: string };

export interface StatusData {
  version: string;
  activeSite: string | null;
  serve: { port: number } | null;
  lastBuild: BuildSummary | null;
}

export interface BuildSummary {
  at: string;
  ok: boolean;
  durationMs: number;
  errors: string[];
}

export interface ServeData {
  port: number;
  rootDir: string;
}

export interface StopData {
  stopped: boolean;
  port: number;
}

export interface LogsData {
  entries: unknown[];
  cursor: number;
  reset: boolean;
}

export type ApiFetch = (params: {
  path: string;
  method?: string;
  body?: string;
}) => Promise<{ status: number; body: string }>;

export class WebetteApi {
  constructor(private apiFetch: ApiFetch) {}

  private async call<T>(
    path: string,
    method?: string,
    payload?: unknown
  ): Promise<ApiResult<T>> {
    try {
      const { body } = await this.apiFetch({
        path,
        method,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      return JSON.parse(body) as ApiResult<T>;
    } catch (error) {
      return {
        ok: false,
        code: "internal_error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  status(): Promise<ApiResult<StatusData>> {
    return this.call("/status");
  }

  build(rootDir: string): Promise<ApiResult<BuildSummary>> {
    return this.call("/build", "POST", { rootDir });
  }

  serve(rootDir: string): Promise<ApiResult<ServeData>> {
    return this.call("/serve", "POST", { rootDir });
  }

  stop(): Promise<ApiResult<StopData>> {
    return this.call("/stop", "POST");
  }

  logs(since = 0): Promise<ApiResult<LogsData>> {
    return this.call(`/logs?since=${since}`);
  }
}
