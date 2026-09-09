/**
 * Cross-platform haptic feedback utility
 * Supports:
 * 1. Standard Web Vibration API (Android / Chrome / Firefox) with robust motor-perceptible durations (45ms+)
 * 2. iOS Safari Taptic Engine (triggering native switch haptic on iOS 17.4+)
 * 3. Tactile micro-click via Web Audio API (unlocked on first user interaction)
 */

let iosSwitchEl = null;
let audioCtx = null;
let audioUnlocked = false;

// Pre-create and unlock AudioContext on first user interaction
const unlockAudio = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    audioUnlocked = true;
  } catch {
    // Ignore audio error
  }
};

if (typeof window !== 'undefined') {
  ['touchstart', 'touchend', 'click'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { once: true, passive: true });
  });
}

const getIOSSwitch = () => {
  if (typeof document === 'undefined') return null;
  if (!iosSwitchEl) {
    try {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';
      input.style.top = '-9999px';
      input.style.left = '-9999px';
      input.setAttribute('aria-hidden', 'true');
      input.tabIndex = -1;
      document.body.appendChild(input);
      iosSwitchEl = input;
    } catch {
      // Fallback
    }
  }
  return iosSwitchEl;
};

// Subtle mechanical micro-click sound to give tangible auditory-tactile feel
const playMicroClick = (freq = 150, duration = 0.01) => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Ignore audio context errors
  }
};

export const triggerHaptic = (type = 'light') => {
  if (typeof window === 'undefined') return;

  // 1. Web Audio synthetic tactile micro-click (universal tangible feedback)
  if (type === 'success') {
    playMicroClick(260, 0.015);
    setTimeout(() => playMicroClick(360, 0.018), 70);
  } else if (type === 'warning') {
    playMicroClick(100, 0.025);
  } else if (type === 'medium') {
    playMicroClick(180, 0.012);
  } else {
    playMicroClick(160, 0.01);
  }

  // 2. iOS Safari Taptic Engine switch trigger (iOS 17.4+)
  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  if (isIOS) {
    const sw = getIOSSwitch();
    if (sw) {
      try {
        sw.click();
      } catch {
        // Ignore
      }
    }
  }

  // 3. Standard Web Vibration API (Android / Chrome / Firefox)
  // Durations are optimized so Samsung/Xiaomi/Pixel linear resonant actuators (LRA) and ERM motors fire distinctly
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(45);
          break;
        case 'medium':
          navigator.vibrate(70);
          break;
        case 'success':
          navigator.vibrate([45, 60, 60]);
          break;
        case 'warning':
          navigator.vibrate([60, 50, 60]);
          break;
        default:
          navigator.vibrate(45);
          break;
      }
    } catch {
      // Ignore vibration error
    }
  }
};

