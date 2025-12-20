import api from './axios';
import { Movement } from '@/types/movement'

export interface GetMovementsParams {
  type?: string
  user_id?: string
  page?: number
  limit?: number
}

export async function getMovements(params?: GetMovementsParams) {
  const { data } = await api.get<Movement[]>('/movements', {
    params,
  })
  return data
}
