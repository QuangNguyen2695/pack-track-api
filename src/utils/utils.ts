export function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

export function generateNumberAlphabet(): string {
  return this.nanoid();
}
