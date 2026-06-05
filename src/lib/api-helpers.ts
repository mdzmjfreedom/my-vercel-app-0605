export function jsonError(message: string, status = 500) {
  return Response.json({ success: false, error: message }, { status });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("请求体不是合法 JSON");
  }
}
