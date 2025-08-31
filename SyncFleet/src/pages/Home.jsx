import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-50">
      {/* Navbar */}
      <header className="bg-white shadow-md py-4 px-6 flex justify-between items-center">
        <div className="text-2xl font-bold text-indigo-600">SyncFleet</div>
        <nav className="space-x-4">
          <Link to="/" className="text-gray-700 hover:text-indigo-600">Home</Link>
          <Link to="/about" className="text-gray-700 hover:text-indigo-600">About</Link>
          <Link to="/contact" className="text-gray-700 hover:text-indigo-600">Contact</Link>
          <Link to="/login" className="text-white bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700">Login</Link>
          <Link to="/register" className="text-indigo-600 border border-indigo-600 px-4 py-2 rounded hover:bg-indigo-50">Register</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4">Synchronize your fleets, effortlessly.</h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-6">
          SyncFleet helps you manage group tracking, real-time coordination, and alert systems for logistics, rideshares, and rescue operations.
        </p>
        <div className="space-x-4">
          <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-3 rounded-md text-lg hover:bg-indigo-700">Get Started</Link>
          <Link to="/about" className="text-indigo-600 border border-indigo-600 px-6 py-3 rounded-md text-lg hover:bg-indigo-50">Learn More</Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-4 px-6 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} SyncFleet. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
