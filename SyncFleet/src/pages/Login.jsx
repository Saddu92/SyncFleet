import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { FiArrowRight } from 'react-icons/fi';
import { LOGIN } from '@/utils/constant.js';
import API from '@/utils/axios.js';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post(LOGIN, { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-100 to-gray-200">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md border border-gray-200">
        {/* Logo and welcome */}
        <div className="mb-4 flex flex-col items-center">
          <span className="text-3xl font-black bg-gradient-to-r from-gray-700 via-gray-900 to-black bg-clip-text text-transparent mb-2">logo</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            Welcome Back!
          </h2>
          <p className="text-gray-500 text-sm">
            Enter your credentials to access your account.
          </p>
        </div>

        {/* Tabs for Login/Register */}
        <div className="flex justify-center mb-4">
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-l-lg font-semibold transition ${
              mode === 'login'
                ? 'bg-gradient-to-r from-gray-800 to-black text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-r-lg font-semibold transition ${
              mode === 'register'
                ? 'bg-gradient-to-r from-gray-800 to-black text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        {/* Social Auth */}
        <div className="flex justify-between mb-4 gap-3">
          <button
            type="button"
            className="w-1/2 flex items-center justify-center border border-gray-300 rounded-lg py-2 bg-gray-50 hover:bg-gray-100 transition font-semibold text-gray-800"
            disabled
          >
            <FaGoogle className="w-5 h-5 mr-2" />
            Google
          </button>
          <button
            type="button"
            className="w-1/2 flex items-center justify-center border border-gray-300 rounded-lg py-2 bg-gray-50 hover:bg-gray-100 transition font-semibold text-gray-800"
            disabled
          >
            <FaFacebookF className="w-5 h-5 mr-2" />
            Facebook
          </button>
        </div>

        <div className="flex items-center my-3">
          <hr className="flex-1 border-gray-200" />
          <span className="mx-2 text-xs text-gray-400 font-semibold">or</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 py-2 px-3 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="email"
              className="block text-gray-700 font-medium mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg py-2 px-3 bg-gray-50 focus:bg-white focus:border-gray-500 focus:ring-2 focus:ring-gray-200 outline-none transition"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-gray-700 font-medium mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg py-2 px-3 bg-gray-50 focus:bg-white focus:border-gray-500 focus:ring-2 focus:ring-gray-200 outline-none transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(show => !show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900"
                tabIndex={-1}
              >
                {showPassword ? (
                  <HiEye className="w-5 h-5" />
                ) : (
                  <HiEyeOff className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="text-right mt-1">
              <a
                href="#"
                className="text-xs text-gray-500 hover:text-black font-medium"
              >
                Forgot Password?
              </a>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-black via-gray-800 to-gray-900 hover:from-gray-700 hover:to-black text-white font-semibold py-2 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
          >
            <FiArrowRight className="w-5 h-5" />
            Login
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-500 text-center">
          By continuing, you agree to SyncFleet's
          <a
            href="#"
            className="text-gray-900 hover:text-black underline mx-1"
          >
            Terms of Service
          </a>
          and
          <a
            href="#"
            className="text-gray-900 hover:text-black underline mx-1"
          >
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
}
