"""
Clap detection for JARVIS - activates when two claps are detected.

Design goals:
  • ZERO cost when the feature is off — only runs when enabled
  • ZERO latency on the audio path — non-blocking queue push
  • Fully local & offline — audio never leaves the machine
  • Detects two claps within a configurable time window (default: 0.3-1.0s)

A clap is detected as a sudden loud spike in audio that quickly decays.
Two claps within the time window trigger the activation callback.
"""
from __future__ import annotations

import queue
import threading
import time
from typing import Callable

import numpy as np

# Sample rate for audio processing (should match the mic sample rate)
SAMPLE_RATE = 16000

# Time window between two claps (in seconds)
MIN_CLAP_INTERVAL = 0.3  # Minimum time between claps
MAX_CLAP_INTERVAL = 1.0  # Maximum time between claps

# Clap detection thresholds
CLAP_THRESHOLD_DB = -10.0  # dB threshold for detecting a clap
SILENCE_THRESHOLD_DB = -30.0  # dB threshold for silence between claps
CLAP_DECAY_TIME = 0.15  # How long a clap sound lasts (seconds)


def _rms_to_db(rms: float) -> float:
    """Convert RMS value to decibels."""
    if rms < 1e-10:
        return -100.0
    return 20.0 * np.log10(rms)


class ClapDetector:
    """
    Detects two claps in quick succession to activate JARVIS.
    Runs in a dedicated thread to avoid blocking the audio path.
    """

    def __init__(self,
                 on_detect: Callable[[], None],
                 min_interval: float = MIN_CLAP_INTERVAL,
                 max_interval: float = MAX_CLAP_INTERVAL,
                 threshold_db: float = CLAP_THRESHOLD_DB,
                 logger: Callable[[str], None] = print,
                 notify: Callable[[str], None] | None = None):
        self._on_detect = on_detect
        self._min_interval = min_interval
        self._max_interval = max_interval
        self._threshold_db = threshold_db
        self._logger = logger
        self._notify = notify or (lambda _msg: None)
        
        self._queue: queue.Queue = queue.Queue(maxsize=50)
        self._thread: threading.Thread | None = None
        self._running = False
        
        # Clap detection state
        self._first_clap_time: float | None = None
        self._in_clap = False
        self._clap_start_time: float | None = None
        self._baseline_rms = 0.0
        self._baseline_samples = 0
        
    def start(self) -> bool:
        """Start the clap detection thread. Returns True on success."""
        if self._running:
            return True
        
        self._running = True
        self._first_clap_time = None
        self._in_clap = False
        self._clap_start_time = None
        self._baseline_rms = 0.0
        self._baseline_samples = 0
        
        self._thread = threading.Thread(target=self._loop, daemon=True, name="ClapDetectorThread")
        self._thread.start()
        self._logger("Clap detection: listening for two claps.")
        return True
    
    def stop(self) -> None:
        """Stop the clap detection thread."""
        self._running = False
        try:
            self._queue.put_nowait(None)
        except Exception:
            pass
    
    @property
    def ready(self) -> bool:
        return self._running
    
    def feed(self, frame_int16) -> None:
        """Called from the mic callback (real-time thread). Must stay cheap."""
        if not self._running:
            return
        try:
            # frame_int16 is a numpy int16 array (possibly 2-D mono)
            data = frame_int16[:, 0].copy() if getattr(frame_int16, "ndim", 1) > 1 else frame_int16.copy()
            self._queue.put_nowait(data)
        except queue.Full:
            pass
        except Exception:
            pass
    
    def _loop(self) -> None:
        """Main detection loop running in background thread."""
        current_time = time.time()
        
        while self._running:
            try:
                frame = self._queue.get(timeout=0.1)
                if frame is None or not self._running:
                    break
                
                # Calculate RMS (volume) of this frame
                frame_float = frame.astype(np.float32) / 32768.0  # Normalize to [-1, 1]
                rms = float(np.sqrt(np.mean(frame_float ** 2)))
                db = _rms_to_db(rms)
                
                # Update baseline (ambient noise level)
                if not self._in_clap and db < self._threshold_db - 10:
                    self._baseline_rms = (self._baseline_rms * 0.99 + rms * 0.01)
                    self._baseline_samples += 1
                
                current_time = time.time()
                
                # Check for clap start (sudden loud spike)
                if not self._in_clap and db >= self._threshold_db:
                    self._in_clap = True
                    self._clap_start_time = current_time
                    self._logger(f"Clap detected at {db:.1f} dB")
                
                # Check for clap end (sound decays)
                elif self._in_clap:
                    time_since_clap = current_time - (self._clap_start_time or current_time)
                    
                    if time_since_clap > CLAP_DECAY_TIME:
                        # Clap has ended
                        self._in_clap = False
                        
                        if self._first_clap_time is None:
                            # First clap detected
                            self._first_clap_time = self._clap_start_time
                            self._logger("First clap - waiting for second clap...")
                        else:
                            # Second clap detected - check timing
                            interval = (self._clap_start_time or current_time) - self._first_clap_time
                            
                            if self._min_interval <= interval <= self._max_interval:
                                # Two claps detected within valid window!
                                self._logger(f"Two claps detected! Interval: {interval:.2f}s")
                                self._notify("Clap detected! Activating JARVIS.")
                                try:
                                    self._on_detect()
                                except Exception as e:
                                    self._logger(f"Clap detection: on_detect error — {e}")
                                
                                # Reset to avoid repeated triggers
                                self._first_clap_time = None
                            else:
                                # Interval too short or too long - reset
                                self._logger(f"Clap interval {interval:.2f}s outside valid range - resetting")
                                self._first_clap_time = None
                        
                        self._clap_start_time = None
                
                # Reset if too much time has passed since first clap
                if self._first_clap_time is not None:
                    time_since_first = current_time - self._first_clap_time
                    if time_since_first > self._max_interval:
                        self._logger("Too much time since first clap - resetting")
                        self._first_clap_time = None
                        
            except queue.Empty:
                # Timeout - just continue
                continue
            except Exception as e:
                self._logger(f"Clap detection error — {e}")
