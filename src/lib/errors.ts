export const getErrorMessage = (error: unknown, fallback?: string) => {
  if (error instanceof Error) {
    return error.message
  }

  return fallback ?? "Something went wrong. Please try again later."
}
