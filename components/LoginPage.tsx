
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole, Gender } from '../types';
import { 
  GraduationCap, ArrowRight, Eye, EyeOff, AlertCircle, 
  Loader2, CheckCircle2, Database, Mail, Lock, User as UserIcon
} from 'lucide-react';

export const LoginPage = () => {
  const { login, signup, seedDatabase, subjects, dbError } = useApp();

  // --- STATE ---
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Default role for signup is Parent, user can change it in the signup form
  const [signupRole, setSignupRole] = useState<UserRole>(UserRole.PARENT);
  const [signupGender, setSignupGender] = useState<Gender>(Gender.BOY);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
         const err = await login(email, password);
         if (err) {
           if (err.includes('Email not confirmed')) {
             setError("Please verify your email address before logging in.");
           } else if (err.includes('Invalid login credentials')) {
             setError("Incorrect email or password.");
           } else {
             setError(err);
           }
         }
      } else {
         if (!name) { setError("Name is required"); setIsLoading(false); return; }
         // Only pass gender if role is STUDENT
         const genderToPass = signupRole === UserRole.STUDENT ? signupGender : undefined;
         const err = await signup(email, password, name, signupRole, genderToPass);
         if (err) setError(err);
         else {
           setSuccessMsg("Account created! Please check your email to confirm.");
           setMode('login');
         }
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
     setIsLoading(true);
     await seedDatabase();
     setIsLoading(false);
     setSuccessMsg("Database seeded successfully!");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden font-sans bg-gradient-to-br from-blue-100 via-white to-orange-50">
      
      {/* Animated Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 w-full max-w-md relative z-10 overflow-hidden">
        
        {/* Decorative Top Bar */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 w-full"></div>

        <div className="p-8 md:p-10">
          
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-display font-extrabold text-gray-900 tracking-tight">
              11+ Yodha
            </h1>
            <p className="text-gray-500 font-medium mt-2">
              {mode === 'login' ? 'Welcome back! Ready to learn?' : 'Start your learning journey today.'}
            </p>
          </div>

          {/* Database Error Banner */}
          {dbError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in fade-in">
              <Database className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Setup Required</h4>
                <p className="text-xs mt-1">Please run the SQL setup script in Supabase.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Feedback Messages */}
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3 border border-red-100 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-green-50 text-green-700 rounded-2xl text-sm font-bold flex items-center gap-3 border border-green-100 animate-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Signup: Name Field */}
            {mode === 'signup' && (
              <div className="space-y-1 animate-in fade-in slide-in-from-left-4 duration-300">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Full Name</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                    placeholder="e.g. Leo Smith"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Signup: Role Selection */}
            {mode === 'signup' && (
               <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">I am a...</label>
                    <div className="grid grid-cols-3 gap-2">
                       {[UserRole.PARENT, UserRole.STUDENT, UserRole.TEACHER].map(role => (
                          <button
                             key={role}
                             type="button"
                             onClick={() => setSignupRole(role)}
                             className={`py-3 rounded-xl text-xs font-bold border transition-all ${signupRole === role ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                          >
                             {role.charAt(0) + role.slice(1).toLowerCase()}
                          </button>
                       ))}
                    </div>
                  </div>

                  {signupRole === UserRole.STUDENT && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Gender</label>
                       <div className="grid grid-cols-2 gap-3">
                          {[Gender.BOY, Gender.GIRL].map(g => (
                             <button
                                key={g}
                                type="button"
                                onClick={() => setSignupGender(g)}
                                className={`py-3 rounded-xl text-sm font-bold border transition-all ${signupGender === g ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                             >
                                {g}
                             </button>
                          ))}
                       </div>
                    </div>
                  )}
               </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 mt-2 rounded-2xl font-bold text-white transition-all shadow-xl shadow-blue-200 bg-gradient-to-r from-blue-600 to-blue-700 hover:to-blue-800 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : (mode === 'login' ? 'Sign In' : 'Create Account')}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm font-medium">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccessMsg(null); }} 
                className="ml-2 text-blue-600 font-bold hover:underline"
              >
                {mode === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>

          {/* Developer Tool: Seed Database (Hidden unless DB is empty and connected) */}
          {subjects.length === 0 && !dbError && (
             <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <button onClick={handleSeed} disabled={isLoading} className="text-xs font-bold text-gray-400 hover:text-blue-500 transition flex items-center justify-center gap-1 mx-auto">
                   {isLoading ? <Loader2 className="animate-spin w-3 h-3"/> : <Database className="w-3 h-3"/>} Populate Demo Data
                </button>
             </div>
          )}

        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-4 text-center w-full text-xs font-bold text-blue-900/30">
         © 2024 11+ Yodha
      </div>
    </div>
  );
};
