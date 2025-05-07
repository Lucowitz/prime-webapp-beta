import React from 'react';
import AuthRoot from '../auth-website/AuthRoot';

interface AuthedIndexProps {
    onLogout: () => void;
}

const AuthedIndex = ({ onLogout }: AuthedIndexProps) => {
  return <AuthRoot onLogout={onLogout} />;
};

export default AuthedIndex;
