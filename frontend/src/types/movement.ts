export interface Movement {
  id: string
  type: string
  action: string
  entity: string
  entity_id?: string
  description: string
  quantity?: number
  amount?: number
  user_id: string
  branch_id: string
  created_at: string
}
