
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole } from '../types';
import { 
  GraduationCap, Users, Settings, ArrowRight, 
  Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 
} from 'lucide-react';

export const LoginPage = () => {
  const { users, login } = useApp();

  // --- STATE ---
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.PARENT);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      // 1. Find user by email (or username) AND Role
      const targetUser = users.find(u => 
        (u.email?.toLowerCase() === email.toLowerCase() || u.name.toLowerCase() === email.toLowerCase()) && 
        u.role === selectedRole
      );

      if (targetUser) {
        // 2. Check Password
        if (targetUser.password === password) {
           // 3. Check Active Status
           if (targetUser.active) {
              login(targetUser); // SUCCESS
           } else {
              setError("This account has been deactivated. Please contact support.");
              setIsLoading(false);
           }
        } else {
           setError("Incorrect password. Please try again.");
           setIsLoading(false);
        }
      } else {
        setError(`No ${selectedRole.toLowerCase()} account found with that email.`);
        setIsLoading(false);
      }
    }, 1500);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setResetSent(true);
      setIsLoading(false);
    }, 1000);
  };

  // --- RENDER HELPERS ---
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.PARENT: return <Users className="w-5 h-5" />;
      case UserRole.STUDENT: return <GraduationCap className="w-5 h-5" />;
      case UserRole.ADMIN: return <Settings className="w-5 h-5" />;
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case UserRole.PARENT: return "Manage plans, assign tasks, and track your child's progress.";
      case UserRole.STUDENT: return "View your weekly plan, take fun tests, and earn rewards!";
      case UserRole.ADMIN: return "Manage content, curriculum, and system users.";
    }
  };

  const getThemeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.PARENT: return "text-kid-secondary border-kid-secondary bg-kid-secondary/10";
      case UserRole.STUDENT: return "text-kid-primary border-kid-primary bg-kid-primary/10";
      case UserRole.ADMIN: return "text-kid-accent border-kid-accent bg-kid-accent/10";
    }
  };

  const getButtonColor = (role: UserRole) => {
    switch (role) {
      case UserRole.PARENT: return "bg-kid-secondary hover:bg-cyan-600 focus:ring-cyan-200";
      case UserRole.STUDENT: return "bg-kid-primary hover:bg-indigo-700 focus:ring-indigo-200";
      case UserRole.ADMIN: return "bg-kid-accent hover:bg-orange-600 focus:ring-orange-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8 font-sans">
      
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row min-h-[600px] border border-gray-100">
        
        {/* LEFT SIDE: ILLUSTRATION & BRANDING */}
        <div className={`md:w-5/12 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden transition-colors duration-500
          ${selectedRole === UserRole.PARENT ? 'bg-cyan-600' : 
            selectedRole === UserRole.STUDENT ? 'bg-indigo-600' : 'bg-orange-500'}`}
        >
          {/* Background Decorative Circles */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

          <div className="relative z-10">
            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
              <GraduationCap className="w-10 h-10" />
              11 Plus Genius
            </h1>
            <p className="text-white/80 mt-2 font-medium">Your pathway to exam success.</p>
          </div>

          <div className="relative z-10 my-10">
             {/* Dynamic Illustration Placeholder */}
             <div className="aspect-square bg-white/10 rounded-3xl backdrop-blur-sm border border-white/20 flex items-center justify-center p-8">
                {selectedRole === UserRole.STUDENT ? (
                   <div className="text-center text-white">
                      <div className="text-6xl mb-4">🚀</div>
                      <h3 className="font-display font-bold text-2xl">Ready to Learn?</h3>
                      <p className="mt-2 text-white/90">Take tests, earn stars, and master your subjects!</p>
                   </div>
                ) : selectedRole === UserRole.PARENT ? (
                  <div className="text-center text-white">
                      <div className="text-6xl mb-4">📅</div>
                      <h3 className="font-display font-bold text-2xl">Plan & Track</h3>
                      <p className="mt-2 text-white/90">Organize study schedules and monitor progress easily.</p>
                   </div>
                ) : (
                  <div className="text-center text-white">
                      <div className="text-6xl mb-4">⚙️</div>
                      <h3 className="font-display font-bold text-2xl">Control Center</h3>
                      <p className="mt-2 text-white/90">Manage the curriculum and user database.</p>
                   </div>
                )}
             </div>
          </div>

          <div className="relative z-10 text-white/60 text-xs">
            © 2024 11 Plus Genius. All rights reserved.
          </div>
        </div>

        {/* RIGHT SIDE: LOGIN FORM */}
        <div className="md:w-7/12 p-8 md:p-12 bg-white flex flex-col justify-center">
          
          <div className="max-w-md mx-auto w-full">
            
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">Welcome back 👋</h2>
              <p className="text-gray-500">Sign in to continue your 11+ journey.</p>
            </div>

            {forgotPasswordMode ? (
              // --- FORGOT PASSWORD FORM ---
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {!resetSent ? (
                  <form onSubmit={handleForgotPassword} className="space-y-6">
                    <button type="button" onClick={() => {setForgotPasswordMode(false); setError(null);}} className="text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
                      <ArrowRight className="w-4 h-4 rotate-180" /> Back to Login
                    </button>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                      <input 
                        type="email" 
                        required
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition font-medium"
                        placeholder="parent@example.com"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : 'Send Reset Link'}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Check your email</h3>
                    <p className="text-gray-500 mb-8">If an account exists, we've sent instructions to reset your password.</p>
                    <button onClick={() => {setForgotPasswordMode(false); setResetSent(false);}} className="text-indigo-600 font-bold hover:underline">Back to Login</button>
                  </div>
                )}
              </div>
            ) : (
              // --- LOGIN FORM ---
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Role Selector */}
                <div className="bg-gray-50 p-1.5 rounded-2xl flex mb-8">
                  {[UserRole.PARENT, UserRole.STUDENT, UserRole.ADMIN].map((role) => (
                    <button
                      key={role}
                      onClick={() => { setSelectedRole(role); setError(null); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2
                        ${selectedRole === role 
                          ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                          : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {getRoleIcon(role)}
                      <span className="capitalize">{role === UserRole.STUDENT ? 'Student' : role === UserRole.PARENT ? 'Parent' : 'Admin'}</span>
                    </button>
                  ))}
                </div>

                {/* Role Description Bubble */}
                <div className={`mb-8 p-4 rounded-xl border text-sm font-medium flex gap-3 items-start ${getThemeColor(selectedRole)}`}>
                  <div className="mt-0.5">{getRoleIcon(selectedRole)}</div>
                  <p>{getRoleDescription(selectedRole)}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Error Banner */}
                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-3 border border-red-100 animate-in shake">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email or Username</label>
                    <input 
                      type="text" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition font-medium"
                      placeholder={selectedRole === UserRole.STUDENT ? "Enter your name" : "name@example.com"}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-sm font-bold text-gray-700">Password</label>
                       <button type="button" onClick={() => setForgotPasswordMode(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Forgot password?</button>
                    </div>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition font-medium"
                        placeholder="Enter password"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 pl-1">Default for demo: <strong>password</strong></p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full py-4 rounded-xl font-bold text-white transition shadow-lg flex items-center justify-center gap-2 transform active:scale-95 duration-200 ${getButtonColor(selectedRole)}`}
                  >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : 'Log in'}
                    {!isLoading && <ArrowRight className="w-5 h-5" />}
                  </button>

                  <div className="pt-4 text-center">
                    {selectedRole === UserRole.PARENT && (
                      <p className="text-sm text-gray-500">
                        Don't have an account? <a href="#" className="font-bold text-kid-secondary hover:underline">Create a parent account</a>
                      </p>
                    )}
                    {selectedRole === UserRole.STUDENT && (
                      <p className="text-sm text-gray-500 font-display text-kid-primary font-bold">
                        "Small steps today, big success tomorrow! 🎯"
                      </p>
                    )}
                     {selectedRole === UserRole.ADMIN && (
                      <p className="text-xs text-gray-400">
                        Restricted Access. System Administrators only.
                      </p>
                    )}
                  </div>
                </form>
              </div>
            )}
            
            {/* Simple Footer Links */}
            <div className="mt-8 flex justify-center gap-6 text-xs text-gray-400 font-medium">
              <a href="#" className="hover:text-gray-600">Privacy Policy</a>
              <a href="#" className="hover:text-gray-600">Terms & Conditions</a>
              <a href="#" className="hover:text-gray-600">Help Center</a>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
