import { useQuery, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

/*
  This file provides two custom React hooks:
  1. useConvexQuery: A wrapper around Convex's useQuery to manage loading, error, and data states in a consistent way.
  2. useConvexMutation: A wrapper around Convex's useMutation to handle mutation state, errors, and loading feedback.

  Why do we need this file?
  - It centralizes and standardizes how we handle async data fetching and mutations with Convex.
  - It provides a consistent interface for loading, error, and data, making UI code simpler and less repetitive.
  - It automatically shows error toasts for failed queries/mutations.
*/

/**
 * useConvexQuery
 * A custom hook to fetch data from Convex queries with built-in loading and error state management.
 * @param {Function} query - The Convex query function to call.
 * @param {...any} args - Arguments to pass to the query.
 * @returns {Object} { data, isLoading, error }
 */
export const useConvexQuery = (query, ...args) => {
  // Call the Convex useQuery hook with the provided query and arguments
  const result = useQuery(query, ...args);

  // Local state for data, loading, and error
  const [data, setData] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // React to changes in the query result
  useEffect(() => {
    if (result === undefined) {
      // Query is still loading
      setIsLoading(true);
    } else {
      try {
        // Query succeeded, update data and clear errors
        setData(result);
        setError(null);
      } catch (err) {
        // If something goes wrong, set error and show toast
        setError(err);
        toast.error(err.message);
      } finally {
        // Loading is done regardless of success or error
        setIsLoading(false);
      }
    }
  }, [result]);

  // Return the current state to the component
  return {
    data,
    isLoading,
    error,
  };
};

/**
 * useConvexMutation
 * A custom hook to perform Convex mutations with built-in loading and error state management.
 * @param {Function} mutation - The Convex mutation function to call.
 * @returns {Object} { mutate, data, isLoading, error }
 */
export const useConvexMutation = (mutation) => {
  // Get the mutation function from Convex
  const mutationFn = useMutation(mutation);

  // Local state for mutation result, loading, and error
  const [data, setData] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // The mutate function wraps the mutation call with state management
  const mutate = async (...args) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call the mutation and store the result
      const response = await mutationFn(...args);
      setData(response);
      return response;
    } catch (err) {
      // On error, set error state and show toast
      setError(err);
      toast.error(err.message);
      throw err;
    } finally {
      // Always stop loading after mutation completes
      setIsLoading(false);
    }
  };

  // Return the mutate function and current state to the component
  return { mutate, data, isLoading, error };
};