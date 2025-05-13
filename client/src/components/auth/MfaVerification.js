import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Form, Alert, Tabs } from '../ui';

/**
 * MFA Verification Component
 * Handles verification of MFA tokens and backup codes during login
 */
const MfaVerification = ({ sessionId, onVerificationSuccess, onCancel }) => {
  const [token, setToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('token');
  
  const { verifyMfa, verifyBackupCode } = useAuth();
  const navigate = useNavigate();
  
  // Auto-focus on the first input field
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.getElementById('mfa-token-input');
      if (input) input.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeTab]);
  
  // Format token input to ensure it's only digits
  const handleTokenChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 6);
    setToken(value);
  };
  
  // Format backup code to uppercase and add dashes
  const handleBackupCodeChange = (e) => {
    let value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    
    // Format with dashes (XXXX-XXXX)
    if (value.length > 4) {
      value = value.substring(0, 4) + '-' + value.substring(4, 8);
    }
    
    setBackupCode(value);
  };
  
  const handleVerifyToken = async (e) => {
    e.preventDefault();
    
    if (token.length !== 6) {
      setError('Please enter a valid 6-digit MFA code');
      return;
    }
    
    setError(null);
    setVerifying(true);
    
    try {
      const response = await verifyMfa(token, sessionId);
      
      if (response.success) {
        if (onVerificationSuccess) {
          onVerificationSuccess(response.data.user);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(response.message || 'Invalid verification code');
      }
    } catch (err) {
      setError(err.message || 'Failed to verify MFA token');
    } finally {
      setVerifying(false);
    }
  };
  
  const handleVerifyBackupCode = async (e) => {
    e.preventDefault();
    
    const cleanCode = backupCode.replace(/[^0-9A-F]/g, '');
    if (cleanCode.length !== 8) {
      setError('Please enter a valid 8-character backup code');
      return;
    }
    
    setError(null);
    setVerifying(true);
    
    try {
      const response = await verifyBackupCode(cleanCode, sessionId);
      
      if (response.success) {
        if (onVerificationSuccess) {
          onVerificationSuccess(response.data.user);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(response.message || 'Invalid backup code');
      }
    } catch (err) {
      setError(err.message || 'Failed to verify backup code');
    } finally {
      setVerifying(false);
    }
  };
  
  return (
    <div className="mfa-verification bg-card rounded-lg shadow-md p-6 w-full max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-center">Two-Factor Authentication</h2>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      
      <Tabs 
        defaultValue={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <Tabs.List className="grid grid-cols-2">
          <Tabs.Trigger value="token">Authenticator Code</Tabs.Trigger>
          <Tabs.Trigger value="backup">Backup Code</Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="token" className="pt-4">
          <Form onSubmit={handleVerifyToken}>
            <div className="space-y-4">
              <div>
                <Form.Label htmlFor="mfa-token-input">
                  Enter the 6-digit code from your authenticator app
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
                  aria-describedby="token-hint"
                />
                <p id="token-hint" className="text-sm text-muted-foreground mt-1">
                  The code expires after 30 seconds
                </p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button type="submit" disabled={verifying}>
                  {verifying ? 'Verifying...' : 'Verify Code'}
                </Button>
                
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </Tabs.Content>
        
        <Tabs.Content value="backup" className="pt-4">
          <Form onSubmit={handleVerifyBackupCode}>
            <div className="space-y-4">
              <div>
                <Form.Label htmlFor="backup-code-input">
                  Enter a backup code
                </Form.Label>
                <Input
                  id="backup-code-input"
                  type="text"
                  autoComplete="off"
                  value={backupCode}
                  onChange={handleBackupCodeChange}
                  required
                  className="text-center text-xl tracking-widest"
                  placeholder="XXXX-XXXX"
                  aria-describedby="backup-hint"
                />
                <p id="backup-hint" className="text-sm text-muted-foreground mt-1">
                  Backup codes can only be used once
                </p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button type="submit" disabled={verifying}>
                  {verifying ? 'Verifying...' : 'Use Backup Code'}
                </Button>
                
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </Tabs.Content>
      </Tabs>
      
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>
          Having trouble? Contact your system administrator or use the Help Desk.
        </p>
      </div>
    </div>
  );
};

export default MfaVerification;