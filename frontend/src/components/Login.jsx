import React, { useState, useRef } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress, Link, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, IconButton } from '@mui/material';
import BrandLogo from './BrandLogo';

export default function Login({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('password123'); // Default for demo
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset password state
  const [showReset, setShowReset] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const emailRef = useRef(null);

  const focusLogin = () => {
    if (emailRef.current) {
      emailRef.current.focus();
      emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }

      // Save token & user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'stretch',
      background: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* LEFT PANEL - Branded Visual */}
      <Box sx={{
        flex: '1 1 55%',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        background: 'linear-gradient(160deg, #1a2244 0%, #2d3a6d 25%, #3b5edb 50%, #4a9de8 75%, #69b4f5 100%)',
        overflow: 'hidden',
        p: 6
      }}>
        {/* Animated floating orbs */}
        <Box sx={{
          position: 'absolute', top: '10%', left: '15%', width: 300, height: 300,
          borderRadius: '50%', background: 'rgba(105, 180, 245, 0.2)',
          filter: 'blur(80px)', animation: 'floatOrb1 8s ease-in-out infinite',
          '@keyframes floatOrb1': { '0%, 100%': { transform: 'translate(0, 0)' }, '50%': { transform: 'translate(30px, -40px)' } }
        }} />
        <Box sx={{
          position: 'absolute', bottom: '15%', right: '10%', width: 250, height: 250,
          borderRadius: '50%', background: 'rgba(168, 216, 240, 0.15)',
          filter: 'blur(60px)', animation: 'floatOrb2 6s ease-in-out infinite',
          '@keyframes floatOrb2': { '0%, 100%': { transform: 'translate(0, 0)' }, '50%': { transform: 'translate(-20px, 30px)' } }
        }} />
        {/* Grid pattern overlay */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 500, cursor: 'pointer' }} onClick={focusLogin}>
          <Box sx={{ mb: 3, animation: 'floatLogo 4s ease-in-out infinite',
            '@keyframes floatLogo': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } }
          }}>
            <BrandLogo width={180} showText={false} color="#ffffff" />
          </Box>
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 900, letterSpacing: '-1px', mb: 2, fontFamily: 'Outfit, sans-serif', lineHeight: 1.1, cursor: 'pointer', '&:hover': { textShadow: '0 0 20px rgba(255,255,255,0.3)' }, transition: 'text-shadow 0.3s' }}>
            YA CONSULTING
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400, lineHeight: 1.6, mb: 5 }}>
            Votre assistant pour coordonner nos experts en cybersécurité, réseaux et sécurité électronique et simplifier leurs interventions sur le terrain.
          </Typography>
          
          {/* Feature pills */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
            {['🗺️ Cartographie temps réel', '📍 Guidage GPS', '👥 Gestion des équipes', '🔒 Sécurisé RGPD'].map((f, i) => (
              <Box key={i} sx={{
                px: 2, py: 0.8, borderRadius: '999px',
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e0eaff', fontSize: '0.8rem', fontWeight: 600,
                transition: 'all 0.3s', cursor: 'pointer',
                '&:hover': { background: 'rgba(255,255,255,0.22)', transform: 'translateY(-3px) scale(1.05)', boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }
              }}>
                {f}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Bottom info + CTA */}
        <Box sx={{ position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center', cursor: 'pointer' }} onClick={focusLogin}>
          <Typography variant="body2" sx={{ 
            color: 'rgba(255,255,255,0.85)', fontWeight: 600, mb: 1.5,
            display: 'inline-flex', alignItems: 'center', gap: 1,
            px: 3, py: 1, borderRadius: '999px',
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s',
            '&:hover': { background: 'rgba(255,255,255,0.22)', transform: 'scale(1.05)' },
            animation: 'pulseBtn 2s ease-in-out infinite',
            '@keyframes pulseBtn': { '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,255,255,0.2)' }, '50%': { boxShadow: '0 0 0 8px rgba(255,255,255,0)' } }
          }}>
            👉 Cliquez ici pour vous connecter
          </Typography>
          <br />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '0.05em' }}>
            Riviera Palmeraie, Cocody, Abidjan — (225) 01 52 22 63 12
          </Typography>
        </Box>
      </Box>

      {/* RIGHT PANEL - Login Form */}
      <Box sx={{
        flex: { xs: '1 1 100%', md: '1 1 45%' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: { xs: 3, sm: 5 },
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef3fa 100%)',
        position: 'relative'
      }}>
        {/* Subtle glow */}
        <Box sx={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(105, 180, 245, 0.15) 0%, transparent 70%)' }} />

        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 3.5, sm: 5 }, 
            maxWidth: 420, 
            width: '100%', 
            borderRadius: '28px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 1)',
            boxShadow: '0 32px 64px -16px rgba(45, 58, 109, 0.1), 0 0 0 1px rgba(255,255,255,0.5) inset',
            zIndex: 1,
            position: 'relative'
          }}
        >
          {/* Mobile-only logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <BrandLogo width={96} showText={false} color="#69b4f5" />
            <Typography variant="h5" fontWeight={800} sx={{ mt: 2, color: '#1a2744', letterSpacing: '-0.5px' }}>
              YA CONSULTING
            </Typography>
          </Box>

          <Typography variant="h5" fontWeight={800} sx={{ color: '#1a2744', mb: 0.5, display: { xs: 'none', md: 'block' } }}>
            Bienvenue 👋
          </Typography>
          <Typography variant="body2" sx={{ color: '#5e7290', mb: 4, display: { xs: 'none', md: 'block' } }}>
            Connectez-vous à votre espace de travail
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              inputRef={emailRef}
              label="Adresse Email ou Téléphone"
              variant="outlined"
              margin="normal"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '14px',
                  bgcolor: 'rgba(255, 255, 255, 0.6)',
                  color: '#1a2744',
                  transition: 'all 0.2s',
                  '& fieldset': { borderColor: '#d6e0f0' },
                  '&:hover fieldset': { borderColor: '#69b4f5' },
                  '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 4px 16px rgba(105, 180, 245, 0.15)' },
                  '&.Mui-focused fieldset': { borderColor: '#69b4f5' }
                },
                '& .MuiInputLabel-root': { color: '#5e7290' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#3b5edb' }
              }}
            />
            <TextField
              fullWidth
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#5e7290' }}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '14px',
                  bgcolor: 'rgba(255, 255, 255, 0.6)',
                  color: '#1a2744',
                  transition: 'all 0.2s',
                  '& fieldset': { borderColor: '#d6e0f0' },
                  '&:hover fieldset': { borderColor: '#69b4f5' },
                  '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 4px 16px rgba(105, 180, 245, 0.15)' },
                  '&.Mui-focused fieldset': { borderColor: '#69b4f5' }
                },
                '& .MuiInputLabel-root': { color: '#5e7290' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#3b5edb' }
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Link 
                component="button" 
                type="button" 
                variant="body2" 
                onClick={() => { setShowReset(true); setResetMessage(''); setResetError(''); setResetIdentifier(identifier); }}
                sx={{ fontWeight: 600, color: '#3b5edb', textDecoration: 'none', '&:hover': { textDecoration: 'underline', color: '#2d3a6d' } }}
              >
                Mot de passe oublié ?
              </Link>
            </Box>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ 
                mt: 4, 
                mb: 3, 
                py: 1.8, 
                borderRadius: '14px',
                fontWeight: 700, 
                fontSize: '1.05rem',
                textTransform: 'none',
                background: 'linear-gradient(135deg, #2d3a6d 0%, #3b5edb 50%, #69b4f5 100%)',
                boxShadow: '0 10px 25px -8px rgba(59, 94, 219, 0.5)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 16px 32px -8px rgba(59, 94, 219, 0.6)',
                  background: 'linear-gradient(135deg, #1a2244 0%, #2d4ab8 50%, #4a9de8 100%)',
                }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Accéder au Portail'}
            </Button>
          </form>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ 
              color: '#5e7290', fontWeight: 500, display: 'inline-block', 
              p: 1.5, bgcolor: 'rgba(244,247,251,0.8)', borderRadius: '12px',
              border: '1px solid #d6e0f0'
            }}>
              <strong style={{ color: '#1a2744' }}>Comptes Démo :</strong><br/>
              Admin : thomas.toure@yaconsulting.ci <br/>
              Tech : koffi.kouadio@yaconsulting.ci <br/>
              Mdp : password123
            </Typography>
          </Box>
        </Paper>

        {/* Bottom copyright */}
        <Typography variant="caption" sx={{ mt: 4, color: '#8899b5', fontWeight: 500 }}>
          © 2025 YA Consulting — Tous droits réservés
        </Typography>
      </Box>

      {/* Forgot Password Modal */}
      <Dialog open={showReset} onClose={() => setShowReset(false)} PaperProps={{ sx: { borderRadius: 3, p: 1, bgcolor: '#1e1e2e', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>Mot de passe oublié</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: '#64748b' }}>
            Veuillez saisir votre adresse e-mail ou votre numéro de téléphone. Un lien de réinitialisation vous sera envoyé.
          </Typography>
          {resetMessage && <Alert severity="success" sx={{ mb: 2 }}>{resetMessage}</Alert>}
          {resetError && <Alert severity="error" sx={{ mb: 2 }}>{resetError}</Alert>}
          <TextField
            fullWidth
            label="Adresse Email ou Téléphone"
            variant="outlined"
            value={resetIdentifier}
            onChange={(e) => setResetIdentifier(e.target.value)}
            disabled={resetLoading || !!resetMessage}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setShowReset(false)} color="inherit" disabled={resetLoading}>Fermer</Button>
          {!resetMessage && (
            <Button 
              variant="contained" 
              color="primary"
              disabled={resetLoading || !resetIdentifier}
              onClick={async () => {
                setResetLoading(true);
                setResetError('');
                try {
                  const res = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: resetIdentifier })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  setResetMessage(data.message);
                } catch (err) {
                  setResetError(err.message);
                } finally {
                  setResetLoading(false);
                }
              }}
            >
              {resetLoading ? <CircularProgress size={20} color="inherit" /> : 'Envoyer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
