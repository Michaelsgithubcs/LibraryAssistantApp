import sqlite3
import numpy as np
from typing import List, Dict, Any
from collections import defaultdict
import os
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

class RecommendationService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.vectorizer = TfidfVectorizer(stop_words='english')
        
    def get_db_connection(self):
        return sqlite3.connect(self.db_path)

    def get_user_ratings(self, user_id: int) -> Dict[int, float]:
        """Get all book ratings for a specific user"""
        # Rating functionality removed
        return {}

    def get_all_ratings(self) -> Dict[int, Dict[int, float]]:
        """Get all ratings from all users"""
        # Rating functionality removed
        return defaultdict(dict)

    def get_book_features(self) -> Dict[int, str]:
        """Get book features (title, author, category, description) for content-based filtering"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, title || ' ' || author || ' ' || category || ' ' || COALESCE(description, '') 
            FROM books
        ''')
        return {book_id: features for book_id, features in cursor.fetchall()}

    def collaborative_filtering(self, user_id: int, n_recommendations: int = 5) -> List[int]:
        """
        Collaborative filtering using user-based approach
        Returns list of recommended book IDs
        """
        try:
            # Get all user ratings
            all_ratings = self.get_all_ratings()
            
            if not all_ratings or user_id not in all_ratings:
                return []

            # Find similar users
            target_ratings = all_ratings[user_id]
            similarities = []
            
            for other_user_id, other_ratings in all_ratings.items():
                if other_user_id == user_id:
                    continue
                    
                # Find common books
                common_books = set(target_ratings.keys()) & set(other_ratings.keys())
                if not common_books:
                    continue
                
                # Calculate similarity (cosine similarity)
                target_scores = [target_ratings[b] for b in common_books]
                other_scores = [other_ratings[b] for b in common_books]
                similarity = cosine_similarity(
                    np.array(target_scores).reshape(1, -1),
                    np.array(other_scores).reshape(1, -1)
                )[0][0]
                
                similarities.append((other_user_id, similarity))
            
            # Sort by similarity and get top N similar users
            similarities.sort(key=lambda x: x[1], reverse=True)
            similar_users = [user_id for user_id, _ in similarities[:10]]
            
            # Find books that similar users liked but target user hasn't read
            recommended_books = {}
            for similar_user in similar_users:
                for book_id, rating in all_ratings[similar_user].items():
                    if book_id not in target_ratings and rating >= 4:  # Only recommend highly rated books
                        recommended_books[book_id] = recommended_books.get(book_id, 0) + rating
            
            # Sort by score and return top N
            return sorted(recommended_books.items(), key=lambda x: x[1], reverse=True)[:n_recommendations]
            
        except Exception as e:
            print(f"Error in collaborative filtering: {str(e)}")
            return []

    def content_based_filtering(self, user_id: int, n_recommendations: int = 5) -> List[int]:
        """
        Content-based filtering using book features
        Returns list of recommended book IDs
        """
        try:
            # Get user's rated books
            user_ratings = self.get_user_ratings(user_id)
            if not user_ratings:
                return []
            
            # Get all books and their features
            book_features = self.get_book_features()
            if not book_features:
                return []
            
            # Create TF-IDF matrix
            book_ids = list(book_features.keys())
            feature_texts = [book_features[bid] for bid in book_ids]
            
            try:
                tfidf_matrix = self.vectorizer.fit_transform(feature_texts)
            except ValueError:
                return []
            
            # Get user's liked books (ratings >= 4)
            liked_books = [bid for bid, rating in user_ratings.items() if rating >= 4]
            if not liked_books:
                return []
            
            # Calculate similarity between user's liked books and all books
            book_similarity = cosine_similarity(tfidf_matrix)
            book_id_to_idx = {bid: idx for idx, bid in enumerate(book_ids)}
            
            # Get average similarity scores
            scores = defaultdict(float)
            for book_id in liked_books:
                if book_id not in book_id_to_idx:
                    continue
                idx = book_id_to_idx[book_id]
                for i, score in enumerate(book_similarity[idx]):
                    scores[book_ids[i]] += score
            
            # Sort by score and filter out already read books
            recommended = []
            for book_id in sorted(scores.keys(), key=lambda x: scores[x], reverse=True):
                if book_id not in user_ratings and book_id in book_id_to_idx:
                    recommended.append(book_id)
                    if len(recommended) >= n_recommendations:
                        break
            
            return recommended
            
        except Exception as e:
            print(f"Error in content-based filtering: {str(e)}")
            return []

    def hybrid_recommendation(self, user_id: int, n_recommendations: int = 5) -> List[Dict[str, Any]]:
        """
        Hybrid recommendation combining collaborative and content-based filtering
        Returns list of recommended books with scores
        """
        # Get recommendations from both methods
        cf_recs = dict(self.collaborative_filtering(user_id, n_recommendations * 2))
        cb_recs = self.content_based_filtering(user_id, n_recommendations * 2)
        
        # Combine scores
        combined_scores = defaultdict(float)
        
        # Add collaborative filtering scores (weighted 0.6)
        for book_id, score in cf_recs.items():
            combined_scores[book_id] += score * 0.6
        
        # Add content-based scores (weighted 0.4)
        for i, book_id in enumerate(cb_recs):
            combined_scores[book_id] += (len(cb_recs) - i) * 0.4
        
        # Sort by combined score
        sorted_recs = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Get book details
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        recommendations = []
        for book_id, score in sorted_recs[:n_recommendations]:
            cursor.execute('''
                SELECT id, title, author, category, COALESCE(description, 'No description available') as description,
                       COALESCE(cover_image, '') as cover_image, available_copies
                FROM books 
                WHERE id = ?
            ''', (book_id,))
            
            book = cursor.fetchone()
            if book:
                recommendations.append({
                    'id': book[0],
                    'title': book[1],
                    'author': book[2],
                    'category': book[3],
                    'description': book[4],
                    'cover_image': book[5],
                    'available_copies': book[6],
                    'score': round(score, 2)
                })
        
        return recommendations
