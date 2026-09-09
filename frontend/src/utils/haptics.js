/**
 * Cross-platform haptic feedback utility
 * Supports:
 * 1. Standard Web Vibration API (Android / Chrome / Firefox) with motor-perceptible durations (30ms+)
 * 2. iOS Safari Taptic Engine (triggering native haptic switch toggle)
 * 3. Subtle synthesized mechanical micro-click via Web Audio API
 */

let iosSwitchEl = null;
let audioCtx = null;

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

// Subtle mechanical micro-click sound (2-5ms) to give tangible auditory-tactile feel
const playMicroClick = (freq = 120, duration = 0.006) => {
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
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
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

  // 1. Web Audio synthetic tactile micro-click (immediate physical feedback on all mobile browsers)
  if (type === 'success') {
    playMicroClick(240, 0.012);
    setTimeout(() => playMicroClick(340, 0.015), 65);
  } else if (type === 'warning') {
    playMicroClick(95, 0.02);
  } else {
    playMicroClick(150, 0.008);
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
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      switch (type) {
        case 'light':
          // 30ms is clearly perceptible on Samsung / Xiaomi / Pixel vibration motors
          navigator.vibrate(30);
          break;
        case 'medium':
          // 50ms distinct solid click
          navigator.vibrate(50);
          break;
        case 'success':
          // [35ms, 50ms pause, 45ms] double tap confirmation
          navigator.vibrate([35, 50, 45]);
          break;
        case 'warning':
          // [50ms, 40ms pause, 50ms] alert
          navigator.vibrate([50, 40, 50]);
          break;
        default:
          navigator.vibrate(35);
          break;
      }
    } catch {
      // Ignore vibration error
    }
  }
};
