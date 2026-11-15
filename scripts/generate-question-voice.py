"""Generate fixed, name-free elya prompts offline. No patient data or hosted API."""
import argparse
import hashlib
import json
from pathlib import Path
import wave
import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro

p=argparse.ArgumentParser()
p.add_argument('--model',required=True)
p.add_argument('--voices',required=True)
p.add_argument('--lines',required=True)
p.add_argument('--output',default='public/media/elya-voice')
a=p.parse_args()
ort.disable_telemetry_events()
k=Kokoro(a.model,a.voices)
lines=json.loads(Path(a.lines).read_text())
root=Path(a.output);root.mkdir(parents=True,exist_ok=True)
manifest={}
for i,text in enumerate(lines):
 name=hashlib.sha256(text.encode()).hexdigest()[:16]+'.wav'
 path=root/name
 if not path.exists():
  speed=1.0 if text.startswith('If you have pelvic pain') else .95
  samples,sr=k.create(text,voice='af_heart',speed=speed,lang='en-us',sentence_pause=.25,clause_pause=.1)
  if not np.isfinite(samples).all() or np.max(np.abs(samples))<.0001:raise RuntimeError('Invalid generated audio')
  with wave.open(str(path),'wb') as wav:
   wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(sr);wav.writeframes((np.clip(samples,-1,1)*32767).astype('<i2').tobytes())
 manifest[text]='/media/elya-voice/'+name
 print(f'{i+1}/{len(lines)} {name}',flush=True)
Path('lib/recorded-voice-manifest.ts').write_text('// Generated offline with Kokoro af_heart, speed 0.95. Fixed prompts only.\nexport const RECORDED_VOICE:Record<string,string>='+json.dumps(manifest,ensure_ascii=False,indent=2)+';\n')
(root/'manifest.json').write_text(json.dumps({'model':'Kokoro-82M v1.0','voice':'af_heart','speed':.95,'phrases':manifest},indent=2))
