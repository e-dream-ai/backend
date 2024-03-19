export const truncateString = (
  str?: string,
  num?: number,
  ellipsis: boolean = true,
): string | undefined => {
  if (!str) {
    return undefined;
  }

  if (str.length > (num ?? 0)) {
    return str.slice(0, num) + (ellipsis ? "..." : ""); // Adds ellipsis (...) to indicate truncation
  } else {
    return str;
  }
};
