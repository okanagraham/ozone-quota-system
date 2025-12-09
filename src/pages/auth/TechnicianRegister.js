// src/pages/auth/TechnicianRegister.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/supabaseClient';
import MultipleFileUpload from '../../components/common/MultipleFileUpload';

const TechnicianRegister = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    full_name: '',
    date_of_birth: '',
    national_id: '',
    telephone: '',
    address: '',
    qualification_level: '',
    training_institution: '',
    training_completion_date: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFilesUploaded = (files) => {
    setUploadedFiles(files);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (formData.password !== formData.passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (!formData.qualification_level) {
      setError('Please select a qualification level');
      return;
    }
    
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one supporting document (ID, training certificate, etc.)');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });
      
      if (authError) throw authError;
      
      const userId = authData.user.id;
      
      // Create user profile
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: formData.email,
          display_name: formData.full_name,
          telephone: formData.telephone,
          role: 'technician',
          created_at: new Date().toISOString()
        }]);
      
      if (userError) throw userError;
      
      // Create technician application
      const { data: techData, error: techError } = await supabase
        .from('technicians')
        .insert([{
          user_id: userId,
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth,
          national_id: formData.national_id,
          email: formData.email,
          telephone: formData.telephone,
          address: formData.address,
          qualification_level: formData.qualification_level,
          training_institution: formData.training_institution,
          training_completion_date: formData.training_completion_date,
          status: 'Pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (techError) throw techError;
      
      // Save uploaded documents
      for (const file of uploadedFiles) {
        await supabase
          .from('technician_documents')
          .insert([{
            technician_id: techData.id,
            document_type: file.name.includes('ID') || file.name.includes('id') ? 'ID' : 
                          file.name.includes('certificate') || file.name.includes('Certificate') ? 'Training Certificate' : 
                          'Other',
            document_name: file.name,
            document_url: file.url,
            uploaded_at: new Date().toISOString()
          }]);
      }
      
      setSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        navigate('/login/technician');
      }, 3000);
      
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-purple-900 flex items-center justify-center text-white text-2xl font-bold">
              NOU
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Technician Certification Application
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Apply to become a certified refrigerant handling technician
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-8">
          {success ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Application Submitted!</h3>
              <p className="mt-2 text-sm text-gray-600">
                Your technician certification application has been submitted successfully. 
                You will receive an email once it has been reviewed by an administrator.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Redirecting to login page...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {/* Account Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Confirm Password <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="password"
                      name="passwordConfirm"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.full_name}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      National ID <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="national_id"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.national_id}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Telephone <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      name="telephone"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.telephone}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Address <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      name="address"
                      required
                      rows={2}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              
              {/* Qualification Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Qualification Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Qualification Level <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="qualification_level"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.qualification_level}
                      onChange={handleChange}
                    >
                      <option value="">Select Level</option>
                      <option value="Level 1">Level 1</option>
                      <option value="Level 2">Level 2</option>
                      <option value="Level 3">Level 3</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Training Institution <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="training_institution"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.training_institution}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Training Completion Date <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="training_completion_date"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={formData.training_completion_date}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              
              {/* Document Upload */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Supporting Documents <span className="text-red-600">*</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please upload copies of your National ID, training certificates, and any other relevant documents.
                </p>
                <MultipleFileUpload
                  onFilesUploaded={handleFilesUploaded}
                  storageBucket="documents"
                  storagePath="technician_applications"
                  acceptedFileTypes=".pdf,.jpg,.jpeg,.png"
                  maxFileSize={10485760}
                  maxFiles={5}
                />
              </div>
              
              {/* Declaration */}
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>Declaration:</strong> I declare that all information provided in this application is true and accurate. 
                  I understand that providing false information may result in rejection of my application and/or revocation of certification.
                </p>
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-between items-center">
                <Link
                  to="/login/technician"
                  className="text-sm font-medium text-purple-600 hover:text-purple-500"
                >
                  Already have an account? Sign in
                </Link>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianRegister;