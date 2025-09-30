import React from 'react';

const NotFound: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#0284c7', marginBottom: '20px' }}>404 - Page Not Found</h1>
      <p style={{ marginBottom: '20px' }}>
        This tracking link is invalid or has expired.
      </p>
      <p>
        If you received an SOS alert, please make sure you're using the exact link that was sent to you.
      </p>
    </div>
  );
};

export default NotFound;