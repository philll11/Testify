import axiosServices from 'utils/axios';

export const getJobStatus = async (id: string): Promise<any> => {
    const response = await axiosServices.get('/background-tasks/job/' + id);
    return response.data;
};
