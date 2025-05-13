import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Form, Alert, Card, Checkbox } from '../ui';

/**
 * MFA Setup Component
 * Handles setting up MFA for a user including QR code display and backup codes
 */
const MfaSetup = ({ onComplete }) => {
  const [step, setStep] = useState('setup'); // setup, verify, backupCodes
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backupCodesSaved, setBackupCodesSaved] = useState(false);
  
  const { enableMfa, confirmMfa } = useAuth();
  
  // Initialize MFA setup and get QR code
  useEffect(() => {
    const initMfaSetup = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await enableMfa();
        
        if (response.success) {
          setQrCode(response.data.qrCode);
          setSecret(response.data.secret);
        } else {
          setError(response.message || 'Failed to initialize MFA setup');
        }
      } catch (err) {
        setError(err.message || 'An error occurred during MFA setup');
      } finally {
        setLoading(false);
      }
    };
    
    if (step === 'setup') {
      initMfaSetup();
    }
  }, [enableMfa, step]);
  
  // Format token input to ensure it's only digits
  const handleTokenChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 6);
    setToken(value);
  };
  
  // Verify MFA token and complete setup
  const handleVerifyToken = async (e) => {
    e.preventDefault();
    
    if (token.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      const response = await confirmMfa(token);
      
      if (response.success) {
        setBackupCodes(response.data.backupCodes);
        setStep('backupCodes');
      } else {
        setError(response.message || 'Invalid verification code');
      }
    } catch (err) {
      setError(err.message || 'Failed to verify MFA token');
    } finally {
      setLoading(false);
    }
  };
  
  // Format backup codes for display
  const formatBackupCodes = () => {
    return backupCodes.map(code => 
      code.replace(/(.{4})(.{4})/, '$1-$2')
    );
  };
  
  // Complete MFA setup
  const handleComplete = () => {
    if (!backupCodesSaved) {
      setError('Please confirm that you have saved your backup codes');
      return;
    }
    
    if (onComplete) {
      onComplete();
    }
  };
  
  // Handle printing of backup codes
  const handlePrintBackupCodes = () => {
    const content = `
      HIPAA Compliance App - MFA Backup Codes
      
      ${formatBackupCodes().join('\n')}
      
      Keep these codes in a safe place. Each code can only be used once.
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>MFA Backup Codes</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            h1 { font-size: 16px; }
            .code { font-size: 14px; margin: 5px 0; letter-spacing: 1px; }
            .note { margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>HIPAA Compliance App - MFA Backup Codes</h1>
          ${formatBackupCodes().map(code => `<div class="code">${code}</div>`).join('')}
          <p class="note">Keep these codes in a safe place. Each code can only be used once.</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };
  
  if (loading && !qrCode) {
    return (
      <div className="text-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4">Initializing MFA setup...</p>
      </div>
    );
  }
  
  return (
    <div className="mfa-setup bg-card rounded-lg shadow-md p-6 w-full max-w-md mx-auto">
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      
      {step === 'setup' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-2 text-center">Set Up Two-Factor Authentication</h2>
          
          <div className="space-y-4">
            <p className="text-sm">
              Two-factor authentication adds an extra layer of security to your account.
              Once enabled, you'll need both your password and a verification code to sign in.
            </p>
            
            <div className="steps space-y-4">
              <div className="step">
                <h3 className="font-medium">1. Install an authenticator app</h3>
                <p className="text-sm text-muted-foreground">
                  Download an authenticator app like Google Authenticator,
                  Microsoft Authenticator, or Authy on your mobile device.
                </p>
              </div>
              
              <div className="step">
                <h3 className="font-medium">2. Scan this QR code</h3>
                {qrCode && (
                  <div className="mt-2 flex justify-center bg-white p-4 rounded-md">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    Or enter this code manually:
                  </p>
                  <div className="mt-1 p-2 bg-muted rounded-md text-center font-mono tracking-wider">
                    {secret}
                  </div>
                </div>
              </div>
              
              <div className="step">
                <Button 
                  className="w-full" 
                  onClick={() => setStep('verify')}
                  disabled={loading}
                >
                  Continue to Verification
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {step === 'verify' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-2 text-center">Verify Your Setup</h2>
          
          <Form onSubmit={handleVerifyToken}>
            <div className="space-y-6">
              <p className="text-sm">
                Enter the 6-digit code from your authenticator app to verify your setup.
              </p>
              
              <div>
                <Form.Label htmlFor="mfa-token-input">
                  Verification Code
                </Form.Label>
                <Input
                  id="mfa-token-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={token}
                  onChange={handleTokenChange}
                  required
                  className="text-center text-xl tracking-widest"
                  placeholder="000000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The code expires after 30 seconds
                </p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify and Continue'}
                </Button>
                
                <Button type="button" variant="outline" onClick={() => setStep('setup')}>
                  Back
                </Button>
              </div>
            </div>
          </Form>
        </div>
      )}
      
      {step === 'backupCodes' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-2 text-center">Save Your Backup Codes</h2>
          
          <div className="space-y-4">
            <Alert variant="warning">
              <p className="font-medium">Important!</p>
              <p className="text-sm">
                Save these backup codes in a secure location. If you lose your authenticator
                device, you'll need these codes to access your account.
              </p>
            </Alert>
            
            <Card className="p-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Backup Codes</h3>
                <div className="grid grid-cols-2 gap-2">
                  {formatBackupCodes().map((code, index) => (
                    <div key={index} className="font-mono bg-muted p-2 rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={handlePrintBackupCodes}
                className="w-full"
              >
                Print Backup Codes
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="confirm-save" 
                  checked={backupCodesSaved}
                  onCheckedChange={setBackupCodesSaved}
                />
                <label htmlFor="confirm-save" className="text-sm cursor-pointer">
                  I have saved these backup codes in a secure location
                </label>
              </div>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleComplete}
              disabled={!backupCodesSaved}
            >
              Complete Setup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MfaSetup;