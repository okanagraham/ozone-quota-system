// src/components/imports/ImportDetail.js
// For viewing and editing import - mark arrived, upload documents
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';

const ImportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [importData, setImportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [existingDocs, setExistingDocs] = useState([]);
  const [markingArrived, setMarkingArrived] = useState(false);

  useEffect(() => {
    fetchImportData();
  }, [id]);

  const fetchImportData = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('imports')
        .select(`
          *,
          users:user_id (display_name, enterprise_name),
          registrations:registration_id (cert_no, year)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setImportData(data);
      setExistingDocs(data.documents || []);
    } catch (err) {
      console.error('Error fetching import:', err);
      setError('Failed to load import details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (files.length === 0) return [];

    const uploadedDocs = [];
    
    for (const file of files) {
      const fileName = `${id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('import-documents')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('import-documents')
        .getPublicUrl(fileName);

      uploadedDocs.push({
        name: file.name,
        url: publicUrl,
        uploaded_at: new Date().toISOString(),
        type: file.type
      });
    }

    return uploadedDocs;
  };

  const handleMarkArrived = async () => {
    if (files.length === 0) {
      setError('Please upload at least one invoice document before marking as arrived.');
      return;
    }

    try {
      setMarkingArrived(true);
      setError(null);

      // Upload files
      const uploadedDocs = await uploadDocuments();
      const allDocs = [...existingDocs, ...uploadedDocs];

      // Update import
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          arrived: true,
          invoice_uploaded: true,
          documents: allDocs,
          arrival_date: new Date().toISOString(),
          status: 'Awaiting Inspection Schedule'
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // TODO: Send notification to admin about shipment arrival

      setFiles([]);
      await fetchImportData();
      alert('Shipment marked as arrived. Admin will schedule inspection.');

    } catch (err) {
      console.