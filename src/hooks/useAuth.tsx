import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Use an environment variable with a fallback for the auth base URL
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5000'; 
const USE_SUPABASE_DIRECTLY = true; // Set this to true to bypass Flask and use Supabase directly

// Function to validate UTD email domain
const isValidUTDEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@utdallas.edu');
};

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const { toast } = useToast();

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = window.localStorage.getItem("impulse_access_token");
    const email = window.localStorage.getItem("impulse_user_email");
    if (token && email) {
      setIsLoggedIn(true);
      setAccessToken(token);
      setVerifiedEmail(email);
      setUser({ email });
      setIsEmailVerified(true); // No email_confirmed_at in custom backend, assume true after login
    }
    setIsLoading(false);
  }, []);

  // Verify user token if needed
  const verify = async (token: string) => {
    try {
      const resp = await fetch(`${AUTH_BASE_URL}/auth/verify`, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token
        }
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      return !!data.email;
    } catch {
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Validate UTD email domain
      if (!isValidUTDEmail(email)) {
        return { 
          success: false, 
          error: new Error("Only @utdallas.edu email addresses are allowed") 
        };
      }

      setIsLoading(true);
      
      // If USE_SUPABASE_DIRECTLY is true, skip Flask attempt and go directly to Supabase
      if (!USE_SUPABASE_DIRECTLY) {
        try {
          console.log("Attempting to login with Flask backend");
          const response = await fetch(`${AUTH_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
          });

          console.log("Login response status:", response.status);
          
          // Check if response is valid
          if (!response.ok) {
            let errorMessage = "Login failed";
            // Try to parse error message from response
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
              console.error("Login error:", errorData);
            } catch (jsonError) {
              console.error("Failed to parse error response:", jsonError);
              // If JSON parsing fails, use status text
              errorMessage = `${response.status}: ${response.statusText || errorMessage}`;
            }
            throw new Error(errorMessage);
          }

          // Parse successful response
          let data;
          try {
            data = await response.json();
            console.log("Login successful:", data);
          } catch (jsonError) {
            console.error("Failed to parse login response:", jsonError);
            throw new Error("Unexpected response from server");
          }

          // Store access token and email in localStorage
          window.localStorage.setItem("impulse_access_token", data.access_token);
          window.localStorage.setItem("impulse_user_email", data.email);

          setIsLoggedIn(true);
          setVerifiedEmail(data.email);
          setIsEmailVerified(true); // Assume email is verified after login
          setUser({ email: data.email });
          setAccessToken(data.access_token);

          return { success: true, data };
        } catch (error: any) {
          console.error("Flask login failed:", error);
          
          // If server is unreachable (404, network error), fallback to Supabase
          if (error.message.includes("404") || error.message.includes("Failed to fetch") || error.message.includes("Load failed")) {
            console.log("Backend server unreachable, falling back to Supabase");
            toast({
              title: "Backend server unreachable",
              description: "Using Supabase authentication instead",
              variant: "destructive", 
            });
          } else {
            // If it's another type of error from Flask, throw it
            throw error;
          }
        }
      }
      
      // Fallback to Supabase or direct Supabase usage
      try {
        console.log("Using Supabase authentication");
        // Fallback to Supabase
        const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (supabaseError) throw supabaseError;
        
        if (data.user && data.session) {
          // Store access token and email in localStorage
          window.localStorage.setItem("impulse_access_token", data.session.access_token);
          window.localStorage.setItem("impulse_user_email", data.user.email || "");
          
          setIsLoggedIn(true);
          setVerifiedEmail(data.user.email || "");
          setIsEmailVerified(true);
          setUser(data.user);
          setAccessToken(data.session.access_token);
          
          return { success: true, data };
        } else {
          throw new Error("Invalid response from Supabase");
        }
      } catch (supabaseError: any) {
        console.error("Supabase authentication failed:", supabaseError);
        throw new Error(supabaseError.message || "Login failed");
      }
    } catch (error: any) {
      setIsLoggedIn(false);
      setVerifiedEmail("");
      setUser(null);
      setAccessToken(null);
      window.localStorage.removeItem("impulse_access_token");
      window.localStorage.removeItem("impulse_user_email");
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, metadata?: { name?: string }) => {
    try {
      // Validate UTD email domain
      if (!isValidUTDEmail(email)) {
        return { 
          success: false, 
          error: new Error("Only @utdallas.edu email addresses are allowed") 
        };
      }

      setIsLoading(true);
      
      // If USE_SUPABASE_DIRECTLY is true, skip Flask attempt and go directly to Supabase
      if (!USE_SUPABASE_DIRECTLY) {
        try {
          const response = await fetch(`${AUTH_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, ...metadata })
          });

          // Check if response is valid
          if (!response.ok) {
            let errorMessage = "Signup failed";
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
              errorMessage = `${response.status}: ${response.statusText || errorMessage}`;
            }
            throw new Error(errorMessage);
          }

          // Parse successful response
          const data = await response.json();
          return { success: true, data };
        } catch (error: any) {
          console.error("Flask signup failed:", error);
          
          // If server is unreachable (404, network error), fallback to Supabase
          if (error.message.includes("404") || error.message.includes("Failed to fetch") || error.message.includes("Load failed")) {
            console.log("Backend server unreachable, using Supabase authentication");
            toast({
              title: "Backend server unreachable",
              description: "Using Supabase authentication instead",
              variant: "destructive", 
            });
          } else {
            // If it's another type of error from Flask, throw it
            throw error;
          }
        }
      }
      
      // Fallback to Supabase or direct Supabase usage
      try {
        console.log("Using Supabase authentication for signup");
        // Set up data object with metadata for profile
        const signupData = { 
          email, 
          password,
          options: {
            data: metadata || {}
          }
        };

        // Call Supabase signup
        const { data, error: supabaseError } = await supabase.auth.signUp(signupData);
        
        if (supabaseError) throw supabaseError;
        
        // Sign up successful
        return { success: true, data };
      } catch (supabaseError: any) {
        console.error("Supabase signup failed:", supabaseError);
        throw new Error(supabaseError.message || "Signup failed with Supabase");
      }
    } catch (error: any) {
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoggedIn(false);
    setIsEmailVerified(false);
    setVerifiedEmail("");
    setUser(null);
    setAccessToken(null);
    window.localStorage.removeItem("impulse_access_token");
    window.localStorage.removeItem("impulse_user_email");
    
    // Always try to logout from Supabase regardless of which auth system was used
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Failed to sign out from Supabase:", error);
    }
  };

  return {
    isLoggedIn,
    isEmailVerified,
    verifiedEmail,
    isLoading,
    user,
    accessToken,
    login,
    signup,
    logout
  };
};

export const useRequireAuth = () => {
  const { isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate("/auth", { state: { from: location.pathname } });
    }
  }, [isLoggedIn, isLoading, navigate, location]);

  return { isLoggedIn, isLoading };
};
