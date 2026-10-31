import { api } from './client';
import { getDeviceId } from '../storage/device';

export interface LibraryExercise {
  id: string; name: string; level: string | null; force: string | null;
  mechanic: string | null; equipment: string | null; appEquipment: string[];
  category: string | null; primaryMuscles: string[]; secondaryMuscles: string[];
  instructions: string[]; source: string;
}

export interface MuscleStat { sets: number; sessions: number; volumeLoadLbs: number; lastTrained: string | null; intensity: number; }

export const listLibraryMuscles = async () =>
  (await api.get<{ muscles: Record<string, { label: string; side: string }> }>('/exercises/library/muscles')).data.muscles;

export const searchLibrary = async (params: { q?: string; muscle?: string; role?: string; equipment?: string; mechanic?: string; level?: string; page?: number }) =>
  (await api.get<{ total: number; page: number; limit: number; exercises: LibraryExercise[] }>('/exercises/library/search', { params })).data;

export const getLibraryExercise = async (id: string) =>
  (await api.get<LibraryExercise>(`/exercises/library/${encodeURIComponent(id)}`)).data;

export const getLibraryAlternatives = async (id: string, equipment?: string) =>
  (await api.get<{ exercise: LibraryExercise; alternatives: { exercise: LibraryExercise; score: number; why: string }[] }>(
    `/exercises/library/${encodeURIComponent(id)}/alternatives`, { params: { equipment } })).data;

export const getMuscleHeatmap = async (days: 7 | 30 = 7) => {
  const headers = { 'x-user-id': await getDeviceId() };
  return (await api.get<{ days: number; muscles: Record<string, MuscleStat> }>('/exercises/library/muscle-heatmap', { params: { days }, headers })).data;
};
