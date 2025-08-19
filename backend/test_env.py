import os

print("Testing environment variables:")
print(f"GEMINI_API_KEY exists: {'Yes' if os.getenv('GEMINI_API_KEY') else 'No'}")
print(f"GENAI_API_KEY exists: {'Yes' if os.getenv('GENAI_API_KEY') else 'No'}")
