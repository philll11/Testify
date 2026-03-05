import axiosServices from 'utils/axios';
import { Collection, CreateCollectionDto } from '../../types/collections/collection.types';

const BASE_URL = '/collections';

export const getCollections = async (): Promise<Collection[]> => {
  const response = await axiosServices.get<Collection[]>(BASE_URL);
  return response.data;
};

export const getCollection = async (id: string): Promise<Collection> => {
  const response = await axiosServices.get<Collection>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createCollection = async (data: CreateCollectionDto): Promise<Collection> => {
  const response = await axiosServices.post<Collection>(BASE_URL, data);
  return response.data;
};

// Optionally execute collection
export const executeCollection = async (collectionId: string, testIds?: string[], environmentId?: string): Promise<void> => {
  await axiosServices.post(`${BASE_URL}/${collectionId}/execute`, { testsToRun: testIds, environmentId });
};

// Optionally delete collection
export const deleteCollection = async (collectionId: string): Promise<void> => {
  await axiosServices.delete(`${BASE_URL}/${collectionId}`);
};
