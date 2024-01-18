/// ColumnVideoTransformer
/**
 * Set video to undefined if is null on database
 */
export class ColumnVideoTransformer {
  to(data: string): string {
    return data;
  }
  from(data: string | null): string | undefined {
    if (data === null) return undefined;
    return data;
  }
}
