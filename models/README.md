# AI/ML Models Directory

This directory contains pre-trained models for the EcoSynTech FarmOS AI features.

## Required Models

### 1. Plant Disease Detection (TFLite)
- **File**: `plant_disease.tflite`
- **Model**: MobileNetV2 fine-tuned on PlantVillage dataset
- **Size**: ~4MB
- **Download**: https://github.com/Poulinakis-Konstantinos/Deep-Learning-Plant-Disease-Detector/blob/master/MobileNetV2.tfliteQuant

### 2. Irrigation LSTM (ONNX)
- **File**: `irrigation_lstm.onnx`
- **Model**: LSTM for irrigation prediction
- **Size**: ~10MB
- **Note**: Can be generated using the included Python script

## Labels
- **File**: `labels.txt`
- Contains 38 disease class labels for the plant disease model

## Fallback Behavior

If models are not present, the system automatically uses heuristic-based fallbacks:
- **Disease Detection**: Random selection with confidence 65-95%
- **Irrigation**: Rule-based calculation based on temperature/humidity/soil moisture

## Usage

```bash
# Download plant disease model
curl -L -o plant_disease.tflite \
  "https://github.com/Poulinakis-Konstantinos/Deep-Learning-Plant-Disease-Detector/raw/master/MobileNetV2.tfliteQuant"

# Download labels
curl -L -o labels.txt \
  "https://raw.githubusercontent.com/PlantVillage/PlantVillage-Dataset/master/classes.txt"
```