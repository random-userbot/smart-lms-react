# 🚀 Quick Start - Exported Models

## ✅ All Models Ready to Use!

**Status**: 5 out of 6 models work perfectly with custom layer support!

---

## 📦 What's in the Export Folder?

```
export/
├── model_loader.py                      ← Custom layer definitions (IMPORTANT!)
├── README.md                            ← Full documentation
├── QUICK_START.md                       ← This file
│
├── Transformer_ViT_59.6%_BEST/          ← 🥇 BEST MODEL
│   ├── best_model.h5                    (385 MB, 33.6M params)
│   ├── test_results.json                (accuracy metrics)
│   └── README.md
│
├── BiLSTM_Enhanced_FMAE_58.6%/          ← 🥈 FAST ALTERNATIVE
│   ├── best_model.h5                    (6.7 MB, 577K params)
│   └── test_results.json
│
├── Fusion_Enhanced_57.4%/               ← Multi-modal fusion
├── Baseline_LSTM_74.2%_BIASED/          ← ⚠️ AVOID (misleading accuracy)
├── BiLSTM_Conservative_34.0%/           ← Low accuracy
└── BiLSTM_Optimized_22.5%/              ← ❌ Failed (Lambda issue)
```

---

## 🎯 30-Second Usage

### 1. Load Model (3 lines)
```python
import sys; sys.path.insert(0, 'export')
from model_loader import load_model_with_custom_layers
model = load_model_with_custom_layers('export/Transformer_ViT_59.6%_BEST/best_model.h5')
```

### 2. Predict (2 lines)
```python
import numpy as np
predictions = model.predict(your_features)  # Shape: (batch, 30, 768)
```

### 3. Parse Results (5 lines)
```python
for i, dim in enumerate(['Boredom', 'Engagement', 'Confusion', 'Frustration']):
    class_id = np.argmax(predictions[i][0])
    level = ['Very Low', 'Low', 'High', 'Very High'][class_id]
    confidence = predictions[i][0][class_id]
    print(f"{dim}: {level} ({confidence:.1%})")
```

**Done!** 🎉

---

## 📊 Model Comparison

| Model | Accuracy | Speed | When to Use |
|-------|----------|-------|-------------|
| **Transformer_ViT_59.6%** | 59.6% | Medium (50-80ms) | ✅ **Production** - Best balance |
| **BiLSTM_Enhanced_58.6%** | 58.6% | Fast (10-20ms) | Real-time on limited hardware |
| Fusion_Enhanced_57.4% | 57.4% | Slow (80-100ms) | Experimental |
| Baseline_74.2% | 74.2%* | Fast (10ms) | ❌ AVOID - biased predictions |

*Baseline 74.2% is misleading - only predicts "Engagement" class

---

## 🔥 Complete Example

```python
#!/usr/bin/env python3
"""Complete working example"""

import sys
import numpy as np
sys.path.insert(0, 'export')
from model_loader import load_model_with_custom_layers

# 1. Load best model
print("Loading Transformer ViT (59.6%)...")
model = load_model_with_custom_layers(
    'export/Transformer_ViT_59.6%_BEST/best_model.h5',
    compile=False
)
print(f"✅ Loaded: {model.count_params():,} parameters")

# 2. Prepare dummy input (replace with real ViT features)
features = np.random.randn(1, 30, 768).astype(np.float32)
print(f"Input shape: {features.shape}")

# 3. Predict
predictions = model.predict(features, verbose=0)

# 4. Parse and display
print("\n📊 Engagement Analysis:")
print("-" * 60)

dimensions = ['Boredom', 'Engagement', 'Confusion', 'Frustration']
levels = ['Very Low', 'Low', 'High', 'Very High']

for i, dim in enumerate(dimensions):
    probs = predictions[i][0]
    class_id = np.argmax(probs)
    confidence = probs[class_id]
    level = levels[class_id]
    
    # Color coding
    emoji = "🟢" if dim == 'Engagement' and class_id >= 2 else \
            "🔴" if dim in ['Confusion', 'Frustration'] and class_id >= 2 else \
            "🟡"
    
    print(f"{emoji} {dim:12} → {level:12} ({confidence:5.1%})")

# 5. Overall score
engagement_score = np.argmax(predictions[1][0])  # Engagement dimension
if engagement_score >= 3:
    print("\n✅ STATUS: Highly Engaged!")
elif engagement_score >= 2:
    print("\n🟡 STATUS: Moderately Engaged")
else:
    print("\n🔴 STATUS: Disengaged - Intervention Needed")
```

**Run it:**
```bash
python complete_example.py
```

---

## ⚡ Fast Model (BiLSTM)

If you need **real-time performance** (<20ms):

```python
# Load faster model
fast_model = load_model_with_custom_layers(
    'export/BiLSTM_Enhanced_FMAE_58.6%/best_model.h5'
)

# Note: Different input shape!
# Input: (batch, 30, 256) - FMAE features instead of ViT
```

**Trade-off**: 58.6% accuracy (1% lower) but 3-5x faster!

---

## 🎬 Real-Time Video Processing

### Conceptual Pipeline:

```python
from collections import deque
from transformers import ViTFeatureExtractor, ViTModel

# 1. Setup ViT feature extractor
vit_extractor = ViTFeatureExtractor.from_pretrained('google/vit-base-patch16-224')
vit_model = ViTModel.from_pretrained('google/vit-base-patch16-224')

# 2. Buffer for 30 frames (1 second @ 30 FPS)
frame_buffer = deque(maxlen=30)

# 3. Load engagement model
engagement_model = load_model_with_custom_layers(
    'export/Transformer_ViT_59.6%_BEST/best_model.h5'
)

# 4. Process video stream
for frame in video_stream:
    # Extract ViT features
    inputs = vit_extractor(frame, return_tensors='pt')
    features = vit_model(**inputs).last_hidden_state[:, 0].numpy()
    
    # Add to buffer
    frame_buffer.append(features[0])
    
    # Predict when buffer full
    if len(frame_buffer) == 30:
        sequence = np.array(frame_buffer)[np.newaxis, ...]
        predictions = engagement_model.predict(sequence, verbose=0)
        
        # Display results
        engagement_level = np.argmax(predictions[1][0])  # Engagement dim
        print(f"Engagement: {['Very Low', 'Low', 'High', 'Very High'][engagement_level]}")
```

---

## 🛠️ Troubleshooting

### Model won't load?
```python
# Make sure you import the custom loader!
from model_loader import load_model_with_custom_layers  # Not tf.keras.models.load_model
```

### Wrong input shape?
```
Transformer: (batch, 30, 768)  ← ViT features
BiLSTM:      (batch, 30, 256)  ← FMAE features
Fusion:      (batch, 30, 1565) ← Combined features
Baseline:    (batch, 30, 22)   ← OpenFace features
```

### Predictions always the same?
- Check if using **Baseline model** (always predicts Engagement)
- Use **Transformer** or **BiLSTM Enhanced** instead

### Too slow for real-time?
- Convert to ONNX (2-3x faster)
- Use BiLSTM_Enhanced instead of Transformer
- Reduce batch size to 1
- Enable GPU acceleration

---

## 📚 Full Documentation

- **README.md** - Complete technical documentation
- **model_loader.py** - Custom layer definitions (AttentionLayer, TransformerBlock, etc.)
- **../FINAL_STRATEGY.md** - Full optimization guide
- **../example_usage.py** - Extended example with batch processing

---

## 🎯 Production Checklist

- [ ] Test model on real video data
- [ ] Measure actual latency on your hardware
- [ ] Implement temporal smoothing (moving average)
- [ ] Add confidence thresholding (reject low-confidence predictions)
- [ ] Consider ONNX conversion for 2-3x speedup
- [ ] Set up monitoring/logging
- [ ] Deploy as REST API (FastAPI recommended)

See `FINAL_STRATEGY.md` for production API implementation!

---

## 📞 Support

**Issues?**
1. Check `model_loader.py` is in same directory
2. Verify input shape matches model requirements
3. Use `load_model_with_custom_layers()` not `tf.keras.models.load_model()`

**Need help?**
- Review `example_usage.py` for working example
- Check `test_exported_models.py` for validation script
- See `FINAL_STRATEGY.md` for optimization guide

---

**Status**: ✅ Ready for Testing & Deployment
**Best Model**: Transformer_ViT_59.6%_BEST
**Test Script**: `python test_exported_models.py`
**Example**: `python example_usage.py`
