export const CONTRIBUTION_POINTS = {
  recommend: 5,
  comment: 10,
  feedback: 10,
  upload: 2,
} as const

export type ContributionAction = keyof typeof CONTRIBUTION_POINTS
