import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const getCompanies = async () => {
  try {
    const response = await api.get('/companies');
    return response.data;
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
};

export const getCompany = async (cin) => {
  try {
    const response = await api.get(`/company/${cin}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching company ${cin}:`, error);
    throw error;
  }
};

export const analyzeCompany = async (cin) => {
  try {
    const response = await api.post(`/analyze/${cin}`);
    return response.data;
  } catch (error) {
    console.error(`Error analyzing company ${cin}:`, error);
    throw error;
  }
};

export const searchRegulation = async (query) => {
  try {
    const response = await api.get('/search-regulation', { params: { q: query } });
    return response.data;
  } catch (error) {
    console.error('Error searching regulation:', error);
    throw error;
  }
};
