export const playerLinkTokens: Record<number, string> = {
  1: 'k7Qa2Zp',
  2: 'M4x9BdR',
  3: 't6Yp1Nc',
  4: 'H8v3LsA',
  5: 'q2Wn7Te',
}

export const playerLinkToSeat = Object.fromEntries(
  Object.entries(playerLinkTokens).map(([seat, token]) => [token, Number(seat)])
)
