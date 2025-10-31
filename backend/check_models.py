import google.generativeai as genai
import os

# Configure API
api_key = "AIzaSyChLLHZIavtONHKrjvqWXAniHunhN-1ZXE"
genai.configure(api_key=api_key)

# List available models
print("Available Gemini models:")
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"- {model.name}")
