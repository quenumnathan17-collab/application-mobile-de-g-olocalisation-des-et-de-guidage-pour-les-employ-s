import React, { useState, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert,
  CircularProgress, Link, Dialog, DialogTitle, DialogContent,
  DialogActions, InputAdornment, IconButton, Tab, Tabs, Avatar
} from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';
import BrandLogo from './BrandLogo';

// ── Shared field styles ───────────────────────────────────────────────────────
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    bgcolor: 'rgba(255,255,255,0.6)',
    color: '#1a2744',
    transition: 'all 0.2s',
    '& fieldset': { borderColor: '#d6e0f0' },
    '&:hover fieldset': { borderColor: '#69b4f5' },
    '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 4px 16px rgba(105,180,245,0.15)' },
    '&.Mui-focused fieldset': { borderColor: '#69b4f5' },
  },
  '& .MuiInputLabel-root': { color: '#5e7290' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#3b5edb' },
};

const btnSx = {
  mt: 3, mb: 2, py: 1.8, borderRadius: '14px',
  fontWeight: 700, fontSize: '1.05rem', textTransform: 'none',
  background: 'linear-gradient(135deg,#2d3a6d 0%,#3b5edb 50%,#69b4f5 100%)',
  boxShadow: '0 10px 25px -8px rgba(59,94,219,0.5)',
  transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 16px 32px -8px rgba(59,94,219,0.6)',
    background: 'linear-gradient(135deg,#1a2244 0%,#2d4ab8 50%,#4a9de8 100%)',
  },
};

// ── LOGIN FORM ────────────────────────────────────────────────────────────────
function LoginForm({ onLoginSuccess, apiUrl = '' }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [showReset, setShowReset]   = useState(false);
  const [resetId, setResetId]       = useState('');
  const [resetMsg, setResetMsg]     = useState('');
  const [resetErr, setResetErr]     = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const emailRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user',  JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ mt: 1.5 }} />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}

      <form onSubmit={handleLogin}>
        <TextField fullWidth inputRef={emailRef} label="Adresse Email ou Téléphone"
          variant="outlined" margin="normal" value={identifier}
          onChange={e => setIdentifier(e.target.value)} required sx={fieldSx} />

        <TextField fullWidth label="Mot de passe"
          type={showPwd ? 'text' : 'password'} variant="outlined" margin="normal"
          value={password} onChange={e => setPassword(e.target.value)} required
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPwd(p => !p)} edge="end" sx={{ color: '#5e7290' }}>
                    {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
          sx={{ mt: 2, ...fieldSx }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Link component="button" type="button" variant="body2"
            onClick={() => { setShowReset(true); setResetMsg(''); setResetErr(''); setResetId(identifier); }}
            sx={{ fontWeight: 600, color: '#3b5edb', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            Mot de passe oublié ?
          </Link>
        </Box>

        <Button fullWidth type="submit" variant="contained" disabled={loading} sx={btnSx}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Accéder au Portail'}
        </Button>
      </form>

      {/* Forgot password modal */}
      <Dialog open={showReset} onClose={() => setShowReset(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Mot de passe oublié</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: '#64748b' }}>
            Saisissez votre adresse e-mail ou votre numéro de téléphone.
          </Typography>
          {resetMsg && <Alert severity="success" sx={{ mb: 2 }}>{resetMsg}</Alert>}
          {resetErr && <Alert severity="error"   sx={{ mb: 2 }}>{resetErr}</Alert>}
          <TextField fullWidth label="Adresse Email ou Téléphone" variant="outlined"
            value={resetId} onChange={e => setResetId(e.target.value)}
            disabled={resetLoading || !!resetMsg} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setShowReset(false)} color="inherit" disabled={resetLoading}>Fermer</Button>
          {!resetMsg && (
            <Button variant="contained" color="primary" disabled={resetLoading || !resetId}
              onClick={async () => {
                setResetLoading(true); setResetErr('');
                try {
                  const res  = await fetch(`${apiUrl}/api/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: resetId }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  setResetMsg(data.message);
                } catch (err) {
                  setResetErr(err.message);
                } finally {
                  setResetLoading(false);
                }
              }}>
              {resetLoading ? <CircularProgress size={20} color="inherit" /> : 'Envoyer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── REGISTER FORM ─────────────────────────────────────────────────────────────
function RegisterForm({ onSwitchToLogin, apiUrl = '' }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [avatar, setAvatar]     = useState(null);   // base64 data URL
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // Convert file to base64
  const processFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez choisir un fichier image (JPG, PNG, WebP…).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 5 Mo.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => setAvatar(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (form.password !== form.confirmPassword) {
      return setError('Les mots de passe ne correspondent pas.');
    }
    if (form.password.length < 6) {
      return setError('Le mot de passe doit contenir au moins 6 caractères.');
    }

    setLoading(true);
    try {
      const res  = await fetch(`${apiUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     form.name.trim(),
          email:    form.email.trim(),
          phone:    form.phone.trim(),
          password: form.password,
          avatar:   avatar || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'inscription.");
      setSuccess(data.message);
      // Auto-redirect to login after 2.5s
      setTimeout(() => onSwitchToLogin(), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ mt: 1.5 }} />

      {error   && <Alert severity="error"   sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>{success}</Alert>}

      <form onSubmit={handleRegister}>

        {/* ── Photo upload ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Box
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            sx={{
              width: 100, height: 100, borderRadius: '50%', cursor: 'pointer',
              border: dragOver ? '3px dashed #3b5edb' : '3px dashed #d6e0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', background: dragOver ? 'rgba(59,94,219,0.06)' : '#f0f4fb',
              transition: 'all 0.2s',
              '&:hover': { borderColor: '#69b4f5', background: 'rgba(105,180,245,0.08)', transform: 'scale(1.04)' },
              position: 'relative'
            }}
          >
            {avatar ? (
              <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Box sx={{ textAlign: 'center', px: 1 }}>
                <Typography sx={{ fontSize: '1.5rem', color: '#94a3b8' }}>+</Typography>
                <Typography variant="caption" sx={{ color: '#5e7290', fontWeight: 600, lineHeight: 1.2 }}>
                  Votre photo
                </Typography>
              </Box>
            )}
          </Box>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={handleFileChange} />

          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button size="small" variant="outlined"
              onClick={() => fileRef.current?.click()}
              sx={{ borderRadius: '20px', textTransform: 'none', fontSize: '0.75rem',
                borderColor: '#d6e0f0', color: '#3b5edb', '&:hover': { borderColor: '#3b5edb' } }}>
              {avatar ? 'Changer' : 'Choisir une photo'}
            </Button>
            {avatar && (
              <Button size="small" variant="text" color="error"
                onClick={() => setAvatar(null)}
                sx={{ borderRadius: '20px', textTransform: 'none', fontSize: '0.75rem' }}>
                Supprimer
              </Button>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: '#8899b5', mt: 0.5 }}>
            JPG, PNG, WebP · max 5 Mo
          </Typography>
        </Box>

        {/* ── Fields ── */}
        <TextField fullWidth label="Nom complet *" variant="outlined" margin="dense"
          value={form.name} onChange={set('name')} required sx={fieldSx} />

        <TextField fullWidth label="Adresse Email *" type="email" variant="outlined" margin="dense"
          value={form.email} onChange={set('email')} required sx={fieldSx} />

        <TextField fullWidth label="Numéro de téléphone *" variant="outlined" margin="dense"
          placeholder="+225 01 00 00 00 00"
          value={form.phone} onChange={set('phone')} required sx={fieldSx} />

        <TextField fullWidth label="Mot de passe *" margin="dense"
          type={showPwd ? 'text' : 'password'} variant="outlined"
          value={form.password} onChange={set('password')} required
          helperText="Au moins 6 caractères"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPwd(p => !p)} edge="end" sx={{ color: '#5e7290' }}>
                    {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
          sx={fieldSx} />

        <TextField fullWidth label="Confirmer le mot de passe *" margin="dense"
          type={showConfirm ? 'text' : 'password'} variant="outlined"
          value={form.confirmPassword} onChange={set('confirmPassword')} required
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirm(p => !p)} edge="end" sx={{ color: '#5e7290' }}>
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
          sx={fieldSx} />

        <Button fullWidth type="submit" variant="contained" disabled={loading || !!success} sx={btnSx}>
          {loading ? <CircularProgress size={24} color="inherit" /> : "Créer mon compte"}
        </Button>
      </form>
    </>
  );
}

// ── MAIN LOGIN PAGE ───────────────────────────────────────────────────────────
export default function Login({ onLoginSuccess, apiUrl = '' }) {
  const [tab, setTab] = useState(0); // 0 = connexion, 1 = inscription

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'stretch',
      background: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* ── LEFT PANEL — Branded visual ── */}
      <Box sx={{
        flex: '1 1 55%',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        background: 'linear-gradient(160deg,#1a2244 0%,#2d3a6d 25%,#3b5edb 50%,#4a9de8 75%,#69b4f5 100%)',
        overflow: 'hidden',
        p: 6,
      }}>
        {/* Animated orbs */}
        <Box sx={{
          position: 'absolute', top: '10%', left: '15%', width: 300, height: 300,
          borderRadius: '50%', background: 'rgba(105,180,245,0.2)', filter: 'blur(80px)',
          animation: 'floatOrb1 8s ease-in-out infinite',
          '@keyframes floatOrb1': { '0%,100%': { transform: 'translate(0,0)' }, '50%': { transform: 'translate(30px,-40px)' } }
        }} />
        <Box sx={{
          position: 'absolute', bottom: '15%', right: '10%', width: 250, height: 250,
          borderRadius: '50%', background: 'rgba(168,216,240,0.15)', filter: 'blur(60px)',
          animation: 'floatOrb2 6s ease-in-out infinite',
          '@keyframes floatOrb2': { '0%,100%': { transform: 'translate(0,0)' }, '50%': { transform: 'translate(-20px,30px)' } }
        }} />
        {/* Grid overlay */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.8) 1px,transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 500 }}>
          <Box sx={{
            mb: 3, animation: 'floatLogo 4s ease-in-out infinite',
            '@keyframes floatLogo': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } }
          }}>
            <BrandLogo width={180} showText={false} color="#ffffff" />
          </Box>
          <Typography variant="h3" sx={{
            color: '#fff', fontWeight: 900, letterSpacing: '-1px', mb: 2,
            fontFamily: 'Outfit,sans-serif', lineHeight: 1.1,
            transition: 'text-shadow 0.3s',
            '&:hover': { textShadow: '0 0 20px rgba(255,255,255,0.3)' }
          }}>
            YA CONSULTING
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400, lineHeight: 1.6, mb: 5 }}>
            Votre assistant pour coordonner nos experts en cybersécurité, réseaux et sécurité électronique et simplifier leurs interventions sur le terrain.
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
            {['Cartographie temps réel', 'Guidage GPS', 'Gestion des équipes', 'Sécurisé RGPD'].map((f, i) => (
              <Box key={i} sx={{
                px: 2, py: 0.8, borderRadius: '999px',
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e0eaff', fontSize: '0.8rem', fontWeight: 600,
                transition: 'all 0.3s',
                '&:hover': { background: 'rgba(255,255,255,0.22)', transform: 'translateY(-3px) scale(1.05)', boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }
              }}>{f}</Box>
            ))}
          </Box>
        </Box>

        {/* Bottom info */}
        <Box sx={{ position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '0.05em' }}>
            Riviera Palmeraie, Cocody, Abidjan — (225) 01 52 22 63 12
          </Typography>
        </Box>
      </Box>

      {/* ── RIGHT PANEL — Form ── */}
      <Box sx={{
        flex: { xs: '1 1 100%', md: '1 1 45%' },
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        p: { xs: 3, sm: 5 },
        background: { xs: 'linear-gradient(160deg,#1a2244 0%,#2d3a6d 25%,#3b5edb 50%,#4a9de8 75%,#69b4f5 100%)', md: 'linear-gradient(180deg,#f8fafc 0%,#eef3fa 100%)' },
        position: 'relative',
        overflowY: 'auto',
      }}>
        {/* Glow */}
        <Box sx={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%,-50%)', width: 400, height: 400,
          borderRadius: '50%', background: 'radial-gradient(circle,rgba(105,180,245,0.15) 0%,transparent 70%)',
          pointerEvents: 'none'
        }} />

        <Paper elevation={0} sx={{
          p: { xs: 3.5, sm: 4.5 },
          maxWidth: 440, width: '100%', borderRadius: '28px',
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,1)',
          boxShadow: '0 32px 64px -16px rgba(45,58,109,0.1),0 0 0 1px rgba(255,255,255,0.5) inset',
          zIndex: 1, position: 'relative',
          my: 4,
        }}>
          {/* Mobile-only logo and presentation */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', alignItems: 'center', mb: 3, textAlign: 'center' }}>
            <BrandLogo width={64} showText={false} color="#3b5edb" />
            <Typography variant="h5" fontWeight={900} sx={{ mt: 1, color: '#2d3a6d', fontFamily: 'Outfit,sans-serif' }}>
              YA CONSULTING
            </Typography>
            <Typography variant="body2" sx={{ color: '#5e7290', mt: 1.2, px: 1, fontSize: '0.82rem', lineHeight: 1.45 }}>
              Votre assistant pour coordonner nos experts en cybersécurité, réseaux et sécurité électronique et simplifier leurs interventions sur le terrain.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, justifyContent: 'center', mt: 1.8 }}>
              {['Cartographie', 'Guidage GPS', 'Équipes', 'RGPD'].map((f, i) => (
                <Box key={i} sx={{
                  px: 1.5, py: 0.4, borderRadius: '999px',
                  background: 'rgba(59, 94, 219, 0.08)',
                  border: '1px solid rgba(59, 94, 219, 0.15)',
                  color: '#2d3a6d', fontSize: '0.72rem', fontWeight: 600
                }}>{f}</Box>
              ))}
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              mb: 3, borderRadius: '12px', bgcolor: '#f0f4fb',
              '& .MuiTabs-indicator': { borderRadius: '8px', height: '100%', bgcolor: '#3b5edb', zIndex: 0 },
              '& .MuiTab-root': {
                zIndex: 1, fontWeight: 700, textTransform: 'none', fontSize: '0.9rem',
                color: '#5e7290', borderRadius: '10px', transition: 'color 0.2s',
                minHeight: '42px',
              },
              '& .Mui-selected': { color: '#fff !important' },
            }}
          >
            <Tab label="Connexion"    id="tab-login"    aria-controls="panel-login" />
            <Tab label="Inscription" id="tab-register" aria-controls="panel-register" />
          </Tabs>

          {/* Tab panels */}
          <Box role="tabpanel" id="panel-login"    aria-labelledby="tab-login"    hidden={tab !== 0}>
            {tab === 0 && <LoginForm onLoginSuccess={onLoginSuccess} apiUrl={apiUrl} />}
          </Box>
          <Box role="tabpanel" id="panel-register" aria-labelledby="tab-register" hidden={tab !== 1}>
            {tab === 1 && <RegisterForm onSwitchToLogin={() => setTab(0)} apiUrl={apiUrl} />}
          </Box>
        </Paper>

        <Typography variant="caption" sx={{ color: { xs: 'rgba(255,255,255,0.5)', md: '#8899b5' }, fontWeight: 500, mb: 3 }}>
          © 2025 YA Consulting — Tous droits réservés
        </Typography>
      </Box>
    </Box>
  );
}
