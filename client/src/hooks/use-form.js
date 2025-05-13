import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import useApi from './use-api';

/**
 * Custom hook for form handling with validation and API submission
 * @param {Object} schema - Zod validation schema
 * @param {string} endpoint - API endpoint for form submission
 * @param {Function} onSuccess - Callback for successful submission
 * @param {Object} defaultValues - Default form values
 * @returns {Object} Form methods and submission handlers
 */
export const useFormWithValidation = (schema, endpoint, onSuccess, defaultValues = {}) => {
  const [serverErrors, setServerErrors] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { post, put } = useApi();

  // Initialize React Hook Form with zod resolver
  const formMethods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur'
  });

  /**
   * Handle form submission with API call
   * @param {Object} data - Form data
   * @param {string} method - HTTP method (post or put)
   */
  const handleSubmit = async (data, method = 'post') => {
    setIsSubmitting(true);
    setServerErrors(null);
    setIsSuccess(false);

    try {
      const apiMethod = method === 'post' ? post : put;
      const response = await apiMethod(endpoint, data);
      
      setIsSuccess(true);
      
      if (onSuccess) {
        onSuccess(response);
      }
      
      return response;
    } catch (error) {
      // Format server errors for display
      if (error.response?.data?.errors) {
        setServerErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setServerErrors({ general: error.response.data.message });
      } else {
        setServerErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
      
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Clear server errors
   */
  const clearErrors = () => {
    setServerErrors(null);
    formMethods.clearErrors();
  };

  /**
   * Reset form state
   */
  const reset = () => {
    formMethods.reset();
    setServerErrors(null);
    setIsSuccess(false);
  };

  return {
    ...formMethods,
    serverErrors,
    isSubmitting,
    isSuccess,
    handleSubmit: formMethods.handleSubmit((data) => handleSubmit(data, 'post')),
    handleUpdate: formMethods.handleSubmit((data) => handleSubmit(data, 'put')),
    clearErrors,
    reset
  };
};

export default useFormWithValidation;