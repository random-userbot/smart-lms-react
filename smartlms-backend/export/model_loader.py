"""
Model loader for custom Keras models.
This file is required to load models saved with custom layers.
"""
from tensorflow import keras
import tensorflow as tf

def load_model_with_custom_layers(model_path: str, compile: bool = False):
    """
    Load a Keras model from the given path, handling custom objects.
    """
    custom_objects = {}
    
    # Add common custom layers/losses you might have used
    # custom_objects['Attention'] = AttentionLayer

    try:
        return keras.models.load_model(model_path, custom_objects=custom_objects, compile=compile)
    except Exception as e:
        print(f"Error loading model {model_path}: {e}")
        raise e
