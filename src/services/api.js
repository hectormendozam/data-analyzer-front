// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const uploadAndAnalyze = async (file, name) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  const response = await fetch(`${API_BASE_URL}/upload/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al analizar el dataset');
  }

  return response.json();
};

export const getAnalyses = async () => {
  const response = await fetch(`${API_BASE_URL}/analyses/`);
  return response.json();
};

// Configurar axios con interceptors para manejo de errores
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos timeout para análisis de datasets grandes
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para manejar errores globalmente
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // El servidor respondió con un código de error
      throw new Error(error.response.data.error || `Error ${error.response.status}: ${error.response.statusText}`);
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      throw new Error('No se pudo conectar con el servidor. Verifica que la API esté ejecutándose.');
    } else {
      // Error en la configuración de la petición
      throw new Error('Error en la configuración de la petición');
    }
  }
);

// Función para subir archivo y obtener análisis
export const uploadAndAnalyzeDataset = async (file, name = null) => {
  try {
    // Validar archivo
    if (!file) {
      throw new Error('No se proporcionó archivo');
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Solo se admiten archivos CSV');
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('El archivo es demasiado grande. Máximo 50MB');
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name || file.name);

    console.log('Enviando archivo para análisis:', file.name);

    // Hacer petición con configuración específica para archivos
    const response = await apiClient.post('/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Callback para progreso de upload (opcional)
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
      }
    });

    console.log('Análisis completado exitosamente');
    return response.data;

  } catch (error) {
    console.error('Error en uploadAndAnalyzeDataset:', error);
    throw error;
  }
};

// Función para obtener lista de análisis previos
export const getAnalysesList = async () => {
  try {
    console.log('Obteniendo lista de análisis...');
    const response = await apiClient.get('/analyses/');
    return response.data;
  } catch (error) {
    console.error('Error al obtener análisis:', error);
    throw error;
  }
};

// Función para obtener detalles de un análisis específico
export const getAnalysisDetail = async (analysisId) => {
  try {
    console.log('Obteniendo detalles del análisis:', analysisId);
    const response = await apiClient.get(`/analyses/${analysisId}/`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener detalles del análisis:', error);
    throw error;
  }
};

// Función para verificar estado de la API
export const checkAPIHealth = async () => {
  try {
    const response = await apiClient.get('/health/');
    return response.data;
  } catch (error) {
    console.error('Error en health check:', error);
    throw error;
  }
};

// Función auxiliar para formatear datos del análisis
export const formatAnalysisData = (rawAnalysis) => {
  try {
    // Si el análisis viene con estructura anidada, extraer los datos principales
    const analysis = rawAnalysis.analysis || rawAnalysis;

    return {
      basic_info: analysis.basic_info || {},
      missing_data: analysis.missing_data || { columns_with_missing: [], total_missing_percentage: 0 },
      duplicates: analysis.duplicates || { total_duplicates: 0, percentage: 0, columns_contributing: [] },
      data_quality: analysis.data_quality || { completeness: 0, consistency: 0, validity: 0, uniqueness: 0 },
      outliers: analysis.outliers || { columns_with_outliers: [] },
      correlation_matrix: analysis.correlation_matrix || [],
      column_statistics: analysis.column_statistics || {},
      recommendations: analysis.recommendations || { critical: [], moderate: [], optional: [] },
      analysis_status: analysis.analysis_status || 'unknown'
    };
  } catch (error) {
    console.error('Error al formatear datos de análisis:', error);
    throw new Error('Error al procesar los datos del análisis');
  }
};

// Función para manejar reconexión automática
export const testConnection = async () => {
  try {
    await checkAPIHealth();
    return true;
  } catch (error) {
    return false;
  }
};

export default {
  uploadAndAnalyzeDataset,
  getAnalysesList,
  getAnalysisDetail,
  checkAPIHealth,
  formatAnalysisData,
  testConnection
};