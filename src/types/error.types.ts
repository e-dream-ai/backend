export class CORSError extends Error {
  constructor(origin: string | undefined) {
    super(`Origin '${origin}' not allowed by CORS`);
    this.name = "CORSError";
  }
}
