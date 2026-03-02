import axiosServices from 'utils/axios';
import { Credential, CreateCredentialPayload } from 'types/iam/credential.types';

const BASE_URL = '/users/me/credentials';

export const getCredentials = async (): Promise<Credential[]> => {
  const response = await axiosServices.get<Credential[]>(BASE_URL);
  return response.data;
};

export const createCredential = async (data: CreateCredentialPayload): Promise<Credential> => {
  const response = await axiosServices.post<Credential>(BASE_URL, data);
  return response.data;
};

export const deleteCredential = async (id: string): Promise<void> => {
  await axiosServices.delete(`${BASE_URL}/${id}`);
};
