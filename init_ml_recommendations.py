#!/usr/bin/env python3
"""
Initialize the ML recommendation system
This script:
1. Updates the database schema
2. Generates sample interaction data if needed
3. Builds the initial ML models and caches features
"""
import os
import sys
import subprocess
from ml_recommendation_service import MLRecommendationService

# Path to the database file
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "library.db")

def init_ml_recommendation_system():
    """Initialize the ML recommendation system"""
    print("Initializing ML recommendation system...")
    
    # 1. Update the database schema
    print("\n--- Updating database schema ---")
    schema_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "update_schema_for_ml.py")
    result = subprocess.run(["python3", schema_script], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error updating schema: {result.stderr}")
        return False
    
    print(result.stdout)
    
    # 2. Check if we have enough interaction data, generate if needed
    print("\n--- Checking user interaction data ---")
    ml_service = MLRecommendationService(DB_PATH)
    
    try:
        interactions = ml_service.get_user_interactions()
        loan_count = len(interactions[interactions['action_type'] == 'borrow'])
        
        print(f"Found {loan_count} existing book loans")
        
        # If we have less than 100 interactions, generate more data
        if loan_count < 100:
            print("Not enough interaction data. Generating more...")
            data_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate_ml_data.py")
            result = subprocess.run(["python3", data_script], capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"Error generating data: {result.stderr}")
            else:
                print(result.stdout)
        else:
            print("Sufficient interaction data found.")
    except Exception as e:
        print(f"Error checking interaction data: {e}")
        # Generate data anyway
        print("Generating interaction data...")
        data_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate_ml_data.py")
        result = subprocess.run(["python3", data_script], capture_output=True, text=True)
    
    # 3. Initialize the ML models
    print("\n--- Building initial ML models ---")
    try:
        # Extract book features
        print("Extracting book features...")
        book_features = ml_service.extract_book_features()
        print(f"Extracted features for {len(book_features)} books")
        
        # Extract user features
        print("Extracting user features...")
        user_features = ml_service.extract_user_features()
        print(f"Extracted features for {len(user_features)} users")
        
        # Fit matrix factorization model
        print("Fitting matrix factorization model...")
        success = ml_service.fit_matrix_factorization()
        if success:
            print("Matrix factorization model built successfully")
        else:
            print("Could not build matrix factorization model - not enough data")
            
        print("\nML recommendation system initialized successfully!")
        return True
    except Exception as e:
        print(f"Error initializing ML models: {e}")
        return False

if __name__ == "__main__":
    if init_ml_recommendation_system():
        print("\nML recommendation system is ready to use!")
    else:
        print("\nFailed to initialize ML recommendation system.")
        sys.exit(1)
