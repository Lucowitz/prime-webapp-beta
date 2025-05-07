import React from 'react';

const ProtectedPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white px-4">
      <h1>Protected Page</h1>
      <p>You have successfully accessed this protected page!</p>
    </div>
  );
};

export default ProtectedPage;
