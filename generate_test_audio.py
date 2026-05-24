#!/usr/bin/env python3
"""Generate test audio with speech for Typography Reel testing."""

import subprocess
import sys
from pathlib import Path

# Try to generate audio using a simple TTS approach
test_script = """
import os
try:
    from gtts import gTTS
    # Text for testing
    text = "Welcome to typography reel generation. This is a test audio with multiple words to animate. Watch how each word appears on the screen with different animations. The system will detect beats and sync the typography to the rhythm of your voice. This is professional grade kinetic typography."

    # Create audio file
    tts = gTTS(text=text, lang='en', slow=False)
    tts.save('test_speech.mp3')
    print("✓ Test audio generated: test_speech.mp3")
except ImportError:
    print("gTTS not installed. Install with: pip install gtts")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
"""

try:
    result = subprocess.run(
        [sys.executable, "-c", test_script],
        cwd=Path(__file__).parent,
        capture_output=True,
        text=True,
        timeout=15
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    sys.exit(result.returncode)
except Exception as e:
    print(f"Error: {e}")
    # Try alternative approach - use ffmpeg to generate silence for now
    print("Falling back to mock approach...")
    sys.exit(1)
