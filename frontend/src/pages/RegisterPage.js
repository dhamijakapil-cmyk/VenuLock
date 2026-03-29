import React from 'react';
import { useNavigate } from 'react-router-dom';

// RegisterPage now just redirects to AuthPage which handles both sign-in and sign-up
const RegisterPage = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    navigate('/auth', { replace: true });
  }, [navigate]);

  return null;
};

export default RegisterPage;
