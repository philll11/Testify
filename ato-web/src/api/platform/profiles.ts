import axiosServices from 'utils/axios';
import {
    PlatformProfile,
    CreatePlatformProfileDto,
    UpdatePlatformProfileDto
} from 'types/platform/profiles';

// --- API Functions ---

const PROFILES_URL = '/platform-profiles';

export const getPlatformProfiles = async (): Promise<PlatformProfile[]> => {
    const response = await axiosServices.get<PlatformProfile[]>(PROFILES_URL);
    return response.data;
};

export const getPlatformProfile = async (id: string): Promise<PlatformProfile> => {
    const response = await axiosServices.get<PlatformProfile>(`${PROFILES_URL}/${id}`);
    return response.data;
};

export const createPlatformProfile = async (data: CreatePlatformProfileDto): Promise<PlatformProfile> => {
    const response = await axiosServices.post<PlatformProfile>(PROFILES_URL, data);
    return response.data;
};

export const updatePlatformProfile = async ({ id, data }: { id: string; data: UpdatePlatformProfileDto }): Promise<PlatformProfile> => {
    const response = await axiosServices.patch<PlatformProfile>(`${PROFILES_URL}/${id}`, data);
    return response.data;
};

export const deletePlatformProfile = async (id: string): Promise<void> => {
    await axiosServices.delete(`${PROFILES_URL}/${id}`);
};
