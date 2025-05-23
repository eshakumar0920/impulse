
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginEmailError, setLoginEmailError] = useState("");

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupEmailError, setSignupEmailError] = useState("");

  const clearError = () => {
    setErrorMessage("");
    setLoginEmailError("");
    setSignupEmailError("");
  };

  const validateUTDEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('@utdallas.edu');
  };

  const handleLoginEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setLoginEmail(email);
    
    // Clear error if previously set
    if (loginEmailError) setLoginEmailError("");
  };

  const handleSignupEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setSignupEmail(email);
    
    // Clear error if previously set
    if (signupEmailError) setSignupEmailError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    // Validate UTD email
    if (!validateUTDEmail(loginEmail)) {
      setLoginEmailError("Please use your UTD email (@utdallas.edu)");
      return;
    }
    
    setIsLoading(true);

    try {
      const result = await login(loginEmail, loginPassword);
      
      if (!result.success) {
        throw new Error(result.error.message);
      }
      
      toast({
        title: "Login successful!",
        description: "Welcome back to UTD Events.",
      });
      
      navigate("/events");
    } catch (error: any) {
      console.error("Login error:", error);
      setErrorMessage(error.message || "An error occurred during login");
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    // Validate UTD email
    if (!validateUTDEmail(signupEmail)) {
      setSignupEmailError("Please use your UTD email (@utdallas.edu)");
      return;
    }
    
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage("Passwords don't match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await signup(signupEmail, signupPassword, { name: signupName });
      
      if (!result.success) {
        throw new Error(result.error.message);
      }
      
      // Check if email confirmation is required
      if (result.data?.user && !result.data.user.email_confirmed_at) {
        toast({
          title: "Verification email sent",
          description: "Please check your email to verify your account before logging in.",
        });
        navigate("/auth");
      } else {
        toast({
          title: "Account created!",
          description: "Welcome to UTD Events.",
        });
        navigate("/events");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      setErrorMessage(error.message || "An error occurred during signup");
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during signup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-background to-muted">
      {/* App Logo/Name */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-medium mb-2">
          <span className="font-bold">i</span>mpulse
        </h1>
        <p className="text-muted-foreground">UTD Student-Led Events Platform</p>
      </div>

      {/* Auth Container */}
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg border border-border p-6">
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="login" className="w-full" onValueChange={clearError}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* Login Form */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="name@utdallas.edu" 
                    className={`pl-10 ${loginEmailError ? "border-destructive" : ""}`}
                    value={loginEmail}
                    onChange={handleLoginEmailChange}
                    required
                  />
                </div>
                {loginEmailError && (
                  <p className="text-xs text-destructive mt-1">{loginEmailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button 
                    type="button" 
                    className="text-xs text-primary hover:underline"
                    onClick={async () => {
                      if (!loginEmail) {
                        toast({
                          title: "Email required",
                          description: "Please enter your email address to reset your password",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      if (!validateUTDEmail(loginEmail)) {
                        toast({
                          title: "Invalid email",
                          description: "Please enter a valid UTD email address (@utdallas.edu)",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(loginEmail);
                        if (error) throw error;
                        
                        toast({
                          title: "Password reset email sent",
                          description: "Check your email for the password reset link",
                        });
                      } catch (error: any) {
                        toast({
                          title: "Failed to send reset email",
                          description: error.message,
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="password"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  "Logging in..."
                ) : (
                  <>
                    Login <LogIn className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Signup Form */}
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="name"
                    type="text" 
                    placeholder="John Doe" 
                    className="pl-10"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="signup-email"
                    type="email" 
                    placeholder="name@utdallas.edu" 
                    className={`pl-10 ${signupEmailError ? "border-destructive" : ""}`}
                    value={signupEmail}
                    onChange={handleSignupEmailChange}
                    required
                  />
                </div>
                {signupEmailError && (
                  <p className="text-xs text-destructive mt-1">{signupEmailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="signup-password"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="confirm-password"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  "Creating account..."
                ) : (
                  <>
                    Create Account <UserPlus className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
