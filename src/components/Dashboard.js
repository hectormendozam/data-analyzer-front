import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter } from 'recharts';
import { Upload, RefreshCw, AlertTriangle, CheckCircle, Info, Database, Wifi, WifiOff } from 'lucide-react';
import { uploadAndAnalyzeDataset, formatAnalysisData, testConnection } from '../services/api';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#ff0088'];

const DatasetDashboard = () => {
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [apiStatus, setApiStatus] = useState('unknown'); // 'online', 'offline', 'unknown'
  const [uploadProgress, setUploadProgress] = useState(0);

  // Verificar conexión con la API al cargar el componente
  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    try {
      const isOnline = await testConnection();
      setApiStatus(isOnline ? 'online' : 'offline');
    } catch (error) {
      setApiStatus('offline');
    }
  };

  const analyzeDataset = async () => {
    if (!file) {
      setError('Por favor, selecciona un archivo CSV');
      return;
    }

    if (apiStatus === 'offline') {
      setError('No se puede conectar con la API. Verifica que el servidor esté ejecutándose.');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);
    setDatasetInfo(null); // Limpiar resultados anteriores
    
    try {
      console.log('Iniciando análisis del dataset:', file.name);
      
      // Llamada real a la API con timeout extendido
      const result = await uploadAndAnalyzeDataset(file, file.name);
      
      console.log('Resultado del análisis:', result);
      
      // Formatear los datos recibidos
      const formattedData = formatAnalysisData(result);
      
      // Actualizar el estado con los datos reales
      setDatasetInfo(formattedData);
      setApiStatus('online');
      
      console.log('Análisis completado exitosamente');
      
    } catch (err) {
      console.error('Error durante el análisis:', err);
      
      let errorMessage = err.message || 'Error al analizar el dataset';
      
      // Proporcionar mensajes más específicos
      if (errorMessage.includes('500')) {
        errorMessage = 'Error interno del servidor. Revisa la consola del backend para más detalles.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'El análisis está tomando demasiado tiempo. Intenta con un archivo más pequeño.';
      } else if (errorMessage.includes('decode')) {
        errorMessage = 'Error de codificación. Guarda tu archivo CSV con codificación UTF-8.';
      }
      
      setError(errorMessage);
      
      // Si es error de conexión, actualizar estado de API
      if (err.message.includes('conectar') || err.message.includes('servidor')) {
        setApiStatus('offline');
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    
    if (!uploadedFile) {
      return;
    }

    // Validaciones del archivo
    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Por favor, sube un archivo CSV válido');
      return;
    }

    if (uploadedFile.size > 50 * 1024 * 1024) { // 50MB
      setError('El archivo es demasiado grande. Máximo 50MB');
      return;
    }

    console.log('Archivo seleccionado:', {
      name: uploadedFile.name,
      size: (uploadedFile.size / 1024 / 1024).toFixed(2) + ' MB',
      type: uploadedFile.type
    });

    setFile(uploadedFile);
    setDatasetInfo(null);
    setError(null);
  };

  // Función para reintentar conexión
  const retryConnection = async () => {
    setLoading(true);
    await checkApiConnection();
    setLoading(false);
  };

  const getQualityColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityIcon = (score) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header con indicador de estado de API */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <h1 className="text-4xl font-bold text-white">
              Dashboard de Análisis de Datasets
            </h1>
            <div className="flex items-center space-x-2">
              {apiStatus === 'online' && <Wifi className="w-6 h-6 text-green-400" />}
              {apiStatus === 'offline' && <WifiOff className="w-6 h-6 text-red-400" />}
              {apiStatus === 'unknown' && <RefreshCw className="w-6 h-6 text-yellow-400 animate-spin" />}
              <span className={`text-sm ${
                apiStatus === 'online' ? 'text-green-400' : 
                apiStatus === 'offline' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {apiStatus === 'online' ? 'API Conectada' : 
                 apiStatus === 'offline' ? 'API Desconectada' : 'Verificando...'}
              </span>
            </div>
          </div>
          <p className="text-slate-300">
            Analiza la calidad de tus datos y toma decisiones informadas sobre el tratamiento necesario
          </p>
          {apiStatus === 'offline' && (
            <div className="mt-4">
              <button
                onClick={retryConnection}
                disabled={loading}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Reintentar Conexión
              </button>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/20">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <Upload className="w-12 h-12 text-purple-300" />
              <div>
                <label className="cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105">
                  Seleccionar CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {file && (
                <div className="text-center">
                  <div className="bg-white/5 rounded-lg p-3 mb-3">
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-slate-300 text-sm">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={analyzeDataset}
                    disabled={loading || apiStatus === 'offline'}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                    <span>
                      {loading ? 'Analizando...' : 
                       apiStatus === 'offline' ? 'API Desconectada' : 'Analizar Dataset'}
                    </span>
                  </button>
                  {loading && (
                    <div className="mt-3">
                      <div className="text-slate-300 text-sm mb-2">
                        Procesando archivo... Esto puede tomar unos momentos
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-200 font-medium">Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
                {apiStatus === 'offline' && (
                  <div className="mt-3 text-xs text-red-400">
                    <p>• Verifica que el servidor Django esté ejecutándose en puerto 8000</p>
                    <p>• Confirma que CORS esté configurado correctamente</p>
                    <p>• Revisa la consola del navegador para más detalles</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Información de debugging en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <h4 className="text-blue-300 font-medium mb-2">Debug Info (Solo en desarrollo)</h4>
            <div className="text-xs text-blue-400 space-y-1">
              <p>API URL: {process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}</p>
              <p>Estado API: {apiStatus}</p>
              <p>Archivo seleccionado: {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'Ninguno'}</p>
            </div>
          </div>
        )}

        {datasetInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Información Básica */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Info className="w-6 h-6 mr-2" />
                Información Básica
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Filas:</span>
                  <span className="text-white font-medium">{datasetInfo.basic_info.total_rows.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Columnas:</span>
                  <span className="text-white font-medium">{datasetInfo.basic_info.total_columns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Tamaño:</span>
                  <span className="text-white font-medium">{datasetInfo.basic_info.file_size}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-lg font-medium text-white mb-3">Tipos de Datos</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={Object.entries(datasetInfo.basic_info.data_types).map(([key, value]) => ({ name: key, value }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {Object.entries(datasetInfo.basic_info.data_types).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Calidad de Datos */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">Métricas de Calidad</h3>
              <div className="space-y-4">
                {Object.entries(datasetInfo.data_quality).map(([metric, score]) => (
                  <div key={metric} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getQualityIcon(score)}
                      <span className="text-slate-300 capitalize">{metric.replace('_', ' ')}</span>
                    </div>
                    <span className={`font-bold ${getQualityColor(score)}`}>
                      {score.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <h4 className="text-lg font-medium text-white mb-3">Distribución de Calidad</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(datasetInfo.data_quality).map(([key, value]) => ({ metric: key.replace('_', ' '), score: value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="metric" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#cbd5e1' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }} 
                    />
                    <Bar dataKey="score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Valores Faltantes */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">Valores Faltantes</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300">Total Missing:</span>
                  <span className="text-red-400 font-bold">{datasetInfo.missing_data.total_missing_percentage}%</span>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={datasetInfo.missing_data.columns_with_missing} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis type="number" tick={{ fill: '#cbd5e1' }} />
                  <YAxis dataKey="column" type="category" tick={{ fill: '#cbd5e1', fontSize: 12 }} width={60} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }} 
                  />
                  <Bar dataKey="percentage" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Duplicados */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">Datos Duplicados</h3>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-orange-400 mb-2">
                  {datasetInfo.duplicates.total_duplicates}
                </div>
                <div className="text-slate-300">
                  {datasetInfo.duplicates.percentage}% del dataset
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-lg font-medium text-white">Columnas Contribuyentes:</h4>
                {datasetInfo.duplicates.columns_contributing.map((col, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-2 text-slate-300">
                    {col}
                  </div>
                ))}
              </div>
            </div>

            {/* Outliers */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">Valores Atípicos</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={datasetInfo.outliers.columns_with_outliers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="column" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <YAxis dataKey="outlier_count" tick={{ fill: '#cbd5e1' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }} 
                  />
                  <Scatter dataKey="outlier_count" fill="#fbbf24" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Correlaciones */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">Correlaciones Principales</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={datasetInfo.correlation_matrix}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="var1" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#cbd5e1' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }} 
                  />
                  <Bar dataKey="correlation" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {datasetInfo && (
          <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">Recomendaciones de Tratamiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg p-4 border border-red-500/30">
                <h4 className="text-red-300 font-medium mb-2">Crítico</h4>
                <ul className="text-slate-300 text-sm space-y-1">
                  {datasetInfo.recommendations?.critical?.map((rec, index) => (
                    <li key={index}>• {rec.description}</li>
                  )) || [
                    <li key="default1">• Tratar valores faltantes ({datasetInfo.missing_data?.total_missing_percentage}%)</li>,
                    <li key="default2">• Eliminar duplicados ({datasetInfo.duplicates?.total_duplicates} registros)</li>
                  ]}
                </ul>
              </div>
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
                <h4 className="text-yellow-300 font-medium mb-2">Moderado</h4>
                <ul className="text-slate-300 text-sm space-y-1">
                  {datasetInfo.recommendations?.moderate?.map((rec, index) => (
                    <li key={index}>• {rec.description}</li>
                  )) || [
                    <li key="default3">• Revisar outliers en columnas numéricas</li>,
                    <li key="default4">• Validar consistencia de datos</li>
                  ]}
                </ul>
              </div>
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
                <h4 className="text-green-300 font-medium mb-2">Opcional</h4>
                <ul className="text-slate-300 text-sm space-y-1">
                  {datasetInfo.recommendations?.optional?.map((rec, index) => (
                    <li key={index}>• {rec.description}</li>
                  )) || [
                    <li key="default5">• Normalización de columnas numéricas</li>,
                    <li key="default6">• Encoding de variables categóricas</li>
                  ]}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatasetDashboard;