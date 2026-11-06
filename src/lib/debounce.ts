export const debounced = <Args extends unknown[]>(
  delay: number,
  fn: (...args: Args) => void,
): ((...args: Args) => void) => {
  let timeout: number | undefined

  return (...args: Args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
