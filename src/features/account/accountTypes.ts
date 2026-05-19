export const accountTypeOptions = [
  {
    label: 'Fan',
    value: 'fan',
  },
  {
    label: 'Performer',
    value: 'performer',
  },
  {
    label: 'Producer',
    value: 'producer',
  },
  {
    label: 'Venue',
    value: 'venue',
  },
] as const

export type AccountType = (typeof accountTypeOptions)[number]['value']

export function formatAccountType(accountType: AccountType) {
  return (
    accountTypeOptions.find((option) => option.value === accountType)?.label ??
    'Fan'
  )
}

export function normalizeAccountType(value: unknown): AccountType {
  if (typeof value !== 'string') {
    return 'fan'
  }

  const normalized = value.trim().toLowerCase()

  return accountTypeOptions.some((option) => option.value === normalized)
    ? (normalized as AccountType)
    : 'fan'
}
