// src/components/common/MultipleFileUpload.js
import React, { useState } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';

const MultipleFileUpload = ({ 
  onFilesUploaded, 
  storageBucket = 'documents',
  storagePath = '',
  acceptedFileTypes = '.pdf,.jpg,.jpeg,.png',
  maxFileSize = 10485760, // 10MB default
  maxFiles = 5,
  disabled = false 
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];
    const newErrors = [];

    // Validate files
    selectedFiles.forEach((file) => {
      // Check file size
      if (file.size > maxFileSize) {
        newErrors.push(`${file.name} exceeds maximum file size of ${(maxFileSize / 1048576).toFixed(0)}MB`);
        return;
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      if (!acceptedFileTypes.includes(fileExtension)) {
        newErrors.push(`${file.name} is not an accepted file type`);
        return;
      }

      validFiles.push(file);
    });

    // Check total number of files
    if (files.length + validFiles.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      setErrors(newErrors);
      return;
    }

    setErrors(newErrors);
    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  const uploadFiles = async () => {
    if (files.length === 0) return [];

    setUploading(true);
    const uploadedFiles = [];
    const newErrors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const filePath = storagePath ? `${storagePath}/${fileName}` : fileName;

      try {
        // Update progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(storageBucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          path: filePath,
          size: file.size,
          type: file.type
        });

        // Update progress to 100%
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        newErrors.push(`Failed to upload ${file.name}: ${error.message}`);
        setUploadProgress(prev => ({ ...prev, [file.name]: -1 })); // -1 indicates error
      }
    }

    setErrors(newErrors);
    setUploading(false);

    // Clear files after successful upload
    if (newErrors.length === 0) {
      setFiles([]);
      setUploadProgress({});
    }

    // Call callback with uploaded files
    if (onFilesUploaded) {
      onFilesUploaded(uploadedFiles);
    }

    return uploadedFiles;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* File Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Files
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
              >
                <span>Upload files</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  multiple
                  accept={acceptedFileTypes}
                  onChange={handleFileSelect}
                  disabled={disabled || uploading}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              {acceptedFileTypes.replace(/\./g, '').toUpperCase()} up to {(maxFileSize / 1048576).toFixed(0)}MB each
            </p>
            <p className="text-xs text-gray-500">
              Maximum {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Errors</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Selected Files ({files.length}/{maxFiles})
          </h4>
          <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
            {files.map((file, index) => {
              const progress = uploadProgress[file.name];
              const hasError = progress === -1;
              const isUploading = progress !== undefined && progress >= 0 && progress < 100;
              const isComplete = progress === 100;

              return (
                <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                  <div className="w-0 flex-1 flex items-center">
                    <svg
                      className={`flex-shrink-0 h-5 w-5 ${hasError ? 'text-red-400' : isComplete ? 'text-green-400' : 'text-gray-400'}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-2 flex-1 w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 truncate">{file.name}</span>
                        <span className="ml-2 text-gray-500">{formatFileSize(file.size)}</span>
                      </div>
                      {isUploading && (
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {hasError && (
                        <span className="text-xs text-red-600">Upload failed</span>
                      )}
                      {isComplete && (
                        <span className="text-xs text-green-600">Upload complete</span>
                      )}
                    </div>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-4 flex-shrink-0 text-red-600 hover:text-red-800"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && !uploading && (
        <button
          type="button"
          onClick={uploadFiles}
          disabled={disabled}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
        </button>
      )}

      {uploading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-gray-700">Uploading files...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultipleFileUpload;