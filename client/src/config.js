const config = {
  // API URL - change this to match your backend deployment
  // For the integrated project, we use a relative path
  API_URL: '/api',
  
  // Authentication settings
  AUTH: {
    TOKEN_KEY: 'hipaa_token',
    USER_KEY: 'hipaa_user',
    EXPIRY_KEY: 'hipaa_token_expiry'
  },
  
  // Application settings
  APP: {
    NAME: 'HIPAA Compliance Manager',
    VERSION: '1.0.0',
    COMPANY: 'Healthcare IT Consulting'
  }
};

export default config;
