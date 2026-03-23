#!/usr/bin/env python3
"""
Custom Layer Definitions for Loading Exported Models
Provides all custom layers used in the trained models
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


# ============================================================================
# Custom Layers
# ============================================================================

class PositionalEncoding(layers.Layer):
    """Add positional information to sequence (used in Transformer)"""
    def __init__(self, max_seq_len=30, d_model=768, **kwargs):
        super().__init__(**kwargs)
        self.max_seq_len = max_seq_len
        self.d_model = d_model
        
        # Create positional encoding matrix
        position = np.arange(max_seq_len)[:, np.newaxis]
        div_term = np.exp(np.arange(0, d_model, 2) * -(np.log(10000.0) / d_model))
        
        pe = np.zeros((max_seq_len, d_model))
        pe[:, 0::2] = np.sin(position * div_term)
        pe[:, 1::2] = np.cos(position * div_term)
        
        self.pos_encoding = tf.constant(pe, dtype=tf.float32)
    
    def call(self, x):
        seq_len = tf.shape(x)[1]
        return x + self.pos_encoding[:seq_len, :]
    
    def get_config(self):
        config = super().get_config()
        config.update({
            'max_seq_len': self.max_seq_len,
            'd_model': self.d_model
        })
        return config


class AttentionLayer(layers.Layer):
    """Attention mechanism for sequence features (used in BiLSTM models)"""
    def __init__(self, units=64, **kwargs):
        super().__init__(**kwargs)
        self.units = units
        
    def build(self, input_shape):
        self.W = layers.Dense(self.units, activation='tanh')
        self.V = layers.Dense(1)
        super().build(input_shape)
    
    def call(self, inputs):
        # inputs: [batch, seq_len, features]
        score = self.V(self.W(inputs))  # [batch, seq_len, 1]
        attention_weights = tf.nn.softmax(score, axis=1)
        context = attention_weights * inputs
        context = tf.reduce_sum(context, axis=1)  # [batch, features]
        return context
    
    def get_config(self):
        config = super().get_config()
        config.update({'units': self.units})
        return config


class MultiHeadAttentionLayer(layers.Layer):
    """Multi-head attention for feature fusion (used in Fusion model)"""
    def __init__(self, num_heads=4, key_dim=64, **kwargs):
        super().__init__(**kwargs)
        self.num_heads = num_heads
        self.key_dim = key_dim
        
    def build(self, input_shape):
        self.mha = layers.MultiHeadAttention(
            num_heads=self.num_heads,
            key_dim=self.key_dim,
            dropout=0.1
        )
        self.layernorm = layers.LayerNormalization()
        super().build(input_shape)
    
    def call(self, inputs, training=False):
        attn_output = self.mha(inputs, inputs, training=training)
        out = self.layernorm(inputs + attn_output)
        return out
    
    def get_config(self):
        config = super().get_config()
        config.update({
            'num_heads': self.num_heads,
            'key_dim': self.key_dim
        })
        return config


class TransformerBlock(layers.Layer):
    """Single transformer encoder block (used in Transformer ViT model)"""
    def __init__(self, d_model, num_heads, ff_dim, dropout=0.1, **kwargs):
        super().__init__(**kwargs)
        self.d_model = d_model
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.dropout_rate = dropout
        
    def build(self, input_shape):
        self.att = layers.MultiHeadAttention(
            num_heads=self.num_heads,
            key_dim=self.d_model // self.num_heads,
            dropout=self.dropout_rate
        )
        self.ffn = keras.Sequential([
            layers.Dense(self.ff_dim, activation='relu'),
            layers.Dropout(self.dropout_rate),
            layers.Dense(self.d_model)
        ])
        
        self.layernorm1 = layers.LayerNormalization(epsilon=1e-6)
        self.layernorm2 = layers.LayerNormalization(epsilon=1e-6)
        self.dropout1 = layers.Dropout(self.dropout_rate)
        self.dropout2 = layers.Dropout(self.dropout_rate)
        super().build(input_shape)
    
    def call(self, inputs, training=False):
        # Multi-head attention
        attn_output = self.att(inputs, inputs, training=training)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.layernorm1(inputs + attn_output)
        
        # Feed-forward network
        ffn_output = self.ffn(out1, training=training)
        ffn_output = self.dropout2(ffn_output, training=training)
        out2 = self.layernorm2(out1 + ffn_output)
        
        return out2
    
    def get_config(self):
        config = super().get_config()
        config.update({
            'd_model': self.d_model,
            'num_heads': self.num_heads,
            'ff_dim': self.ff_dim,
            'dropout': self.dropout_rate
        })
        return config


# ============================================================================
# Model Loader Function
# ============================================================================

def load_model_with_custom_layers(model_path, compile=False):
    """
    Load a model with custom layers
    
    Args:
        model_path: Path to .h5 or .keras model file
        compile: Whether to compile the model after loading
    
    Returns:
        Loaded Keras model
    """
    custom_objects = {
        'PositionalEncoding': PositionalEncoding,
        'AttentionLayer': AttentionLayer,
        'MultiHeadAttentionLayer': MultiHeadAttentionLayer,
        'TransformerBlock': TransformerBlock,
    }
    
    try:
        # Try loading with custom objects
        model = keras.models.load_model(
            model_path,
            custom_objects=custom_objects,
            compile=compile
        )
        return model
    except Exception as e:
        # If it fails with Lambda layer, try unsafe deserialization
        if "Lambda" in str(e):
            print(f"Warning: Model contains Lambda layers. Enabling unsafe deserialization...")
            keras.config.enable_unsafe_deserialization()
            model = keras.models.load_model(
                model_path,
                custom_objects=custom_objects,
                compile=compile
            )
            return model
        else:
            raise e


# ============================================================================
# Quick Test Function
# ============================================================================

def test_model(model_path):
    """
    Quick test to verify model loads and works
    
    Args:
        model_path: Path to model file
    
    Returns:
        dict with test results
    """
    import os
    from pathlib import Path
    
    model_path = Path(model_path)
    
    print(f"Testing: {model_path.name}")
    print("-" * 80)
    
    if not model_path.exists():
        return {'status': 'error', 'message': 'File not found'}
    
    print(f"  Size: {model_path.stat().st_size / 1024**2:.2f} MB")
    
    try:
        # Load model
        print("  Loading...", end=" ")
        model = load_model_with_custom_layers(model_path, compile=False)
        print("✅")
        
        # Get info
        print(f"  Input: {model.input_shape}")
        print(f"  Outputs: {len(model.outputs) if isinstance(model.output, list) else 1}")
        print(f"  Parameters: {model.count_params():,}")
        
        # Create dummy input
        if isinstance(model.input_shape, list):
            input_shape = model.input_shape[0]
        else:
            input_shape = model.input_shape
        
        test_shape = tuple(1 if dim is None else dim for dim in input_shape)
        dummy_input = np.random.randn(*test_shape).astype(np.float32)
        
        # Test prediction
        print("  Predicting...", end=" ")
        predictions = model.predict(dummy_input, verbose=0)
        print("✅")
        
        # Parse outputs
        if isinstance(predictions, list):
            print(f"  Output: {len(predictions)} dimensions")
            dims = ['Boredom', 'Engagement', 'Confusion', 'Frustration']
            for i, pred in enumerate(predictions[:4]):
                class_id = np.argmax(pred[0])
                conf = pred[0][class_id]
                level = ['Very Low', 'Low', 'High', 'Very High'][class_id]
                print(f"    {dims[i]}: {level} ({conf:.1%})")
        
        print("  Status: ✅ Working")
        
        return {
            'status': 'success',
            'input_shape': input_shape,
            'params': model.count_params(),
            'outputs': len(predictions) if isinstance(predictions, list) else 1
        }
        
    except Exception as e:
        print(f"  Status: ❌ Error - {e}")
        return {'status': 'error', 'message': str(e)}


# ============================================================================
# Usage Examples
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("CUSTOM LAYER DEFINITIONS - Model Loader")
    print("=" * 80)
    print()
    
    print("Available custom layers:")
    print("  - PositionalEncoding (Transformer)")
    print("  - TransformerBlock (Transformer)")
    print("  - AttentionLayer (BiLSTM)")
    print("  - MultiHeadAttentionLayer (Fusion)")
    print()
    
    print("Usage Example:")
    print("-" * 80)
    print("""
# Import the loader
from export.model_loader import load_model_with_custom_layers

# Load any model
model = load_model_with_custom_layers('export/Transformer_ViT_59.6%_BEST/best_model.h5')

# Use normally
predictions = model.predict(your_features)
""")
    print()
    
    # Test all exported models if available
    from pathlib import Path
    export_dir = Path(__file__).parent
    
    if export_dir.name == 'export':
        print("Testing all exported models:")
        print("=" * 80)
        
        results = []
        for folder in sorted(export_dir.iterdir()):
            if folder.is_dir():
                model_file = folder / "best_model.h5"
                if model_file.exists():
                    result = test_model(model_file)
                    results.append((folder.name, result))
                    print()
        
        # Summary
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        working = sum(1 for _, r in results if r['status'] == 'success')
        print(f"✅ Working: {working}/{len(results)}")
        print(f"❌ Failed: {len(results) - working}/{len(results)}")
    else:
        print("Run this script from the export/ directory to test all models")
