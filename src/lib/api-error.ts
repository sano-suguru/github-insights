export type ApiErrorCode =
  | "BAD_REQUEST"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "INTERNAL";

export type ApiErrorResponseBody = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export function isApiErrorResponseBody(value: unknown): value is ApiErrorResponseBody {
  if (!value || typeof value !== "object") return false;
  const maybeError = (value as { error?: unknown }).error;
  if (!maybeError || typeof maybeError !== "object") return false;
  const code = (maybeError as { code?: unknown }).code;
  const message = (maybeError as { message?: unknown }).message;
  return (
    (code === "BAD_REQUEST" ||
      code === "FORBIDDEN" ||
      code === "NOT_FOUND" ||
      code === "RATE_LIMIT" ||
      code === "INTERNAL") &&
    typeof message === "string"
  );
}
