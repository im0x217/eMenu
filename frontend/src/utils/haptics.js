/**
 * Cross-platform haptic feedback utility
 * Supports:
 * 1. Standard Web Vibration API (Android / Chrome / Firefox) with solid 50-80ms motor pulses
 * 2. iOS Safari Taptic Engine (triggering native switch haptic on iOS 17.4+)
 * 3. Double acoustic-tactile micro-burst via Web Audio API (unlocked on pointerdown/touch)
 */

let iosSwitchEl = null;
let audioCtx = null;

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
  } catch {
    // Ignore audio error
  }
};

if (typeof window !== 'undefined') {
  ['pointerdown', 'touchstart', 'touchend', 'click'].forEach(evt => {
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

// Acoustic-tactile mechanical pulse to simulate hardware tactile switch
const playMicroClick = (freq = 150, duration = 0.012, gainLevel = 0.09) => {
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
    gain.gain.setValueAtTime(gainLevel, audioCtx.currentTime);
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

  // 1. Dual-tone Acoustic-Tactile synthesis (works on all devices, phones & tablets)
  if (type === 'success') {
    playMicroClick(280, 0.018, 0.1);
    setTimeout(() => playMicroClick(380, 0.02, 0.11), 60);
  } else if (type === 'warning') {
    playMicroClick(90, 0.03, 0.12);
  } else if (type === 'medium') {
    playMicroClick(200, 0.015, 0.09);
  } else {
    playMicroClick(170, 0.012, 0.08);
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

  // 3. Web Vibration API (Android Samsung / Xiaomi / Pixel / Honor)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(50);
          break;
        case 'medium':
          navigator.vibrate(75);
          break;
        case 'success':
          navigator.vibrate([50, 50, 65]);
          break;
        case 'warning':
          navigator.vibrate([65, 45, 65]);
          break;
        default:
          navigator.vibrate(50);
          break;
      }
    } catch {
      // Ignore vibration error
    }
  }
};

