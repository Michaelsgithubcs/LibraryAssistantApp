import sqlite3
import numpy as np
from typing import List, Dict, Any, Tuple, Union
from collections import defaultdict, Counter
import os
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sentence_transformers import SentenceTransformer
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RecommendationService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.tfidf_vectorizer = TfidfVectorizer(stop_words='english')
        self.sentence_model = None
        try:
            self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            logger.warning(f"Could not load sentence transformer: {e}")
        self.book_embeddings = {}
        self.popular_books = []
        self.association_rules = []
        self._load_models()
        
    def get_db_connection(self):
        return sqlite3.connect(self.db_path)

    def get_user_ratings(self, user_id: int) -> Dict[int, float]:
        """Get all book ratings for a specific user"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT book_id, rating FROM book_ratings 
            WHERE user_id = ?
        ''', (user_id,))
        return {book_id: rating for book_id, rating in cursor.fetchall()}

    def get_all_ratings(self) -> Dict[int, Dict[int, float]]:
        """Get all ratings from all users"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT user_id, book_id, rating FROM book_ratings')
        
        user_ratings = defaultdict(dict)
        for user_id, book_id, rating in cursor.fetchall():
            user_ratings[user_id][book_id] = rating
        return user_ratings

    def _load_models(self):
        """Load or initialize all necessary models and data"""
        # Load popular books
        self._load_popular_books()
        # Generate book embeddings
        self._generate_book_embeddings()
        # Generate association rules
        self._generate_association_rules()

    def _load_popular_books(self, limit: int = 50):
        """Load most popular books based on borrowing frequency"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT b.id, b.title, b.author, b.category, COUNT(ib.id) as borrow_count
            FROM books b
            LEFT JOIN issued_books ib ON b.id = ib.book_id
            GROUP BY b.id
            ORDER BY borrow_count DESC
            LIMIT ?
        ''', (limit,))
        self.popular_books = [dict(row) for row in cursor.fetchall()]

    def _generate_book_embeddings(self):
        """Generate vector embeddings for all books"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, title, author, category, COALESCE(description, '') as description
            FROM books
        ''')
        books = cursor.fetchall()
        
        # TF-IDF features
        texts = [f"{title} {author} {category} {desc}" 
                for _, title, author, category, desc in books]
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(texts)
        
        # BERT embeddings if available
        bert_embeddings = None
        if self.sentence_model:
            try:
                bert_embeddings = self.sentence_model.encode(texts)
            except Exception as e:
                logger.error(f"Error generating BERT embeddings: {e}")
        
        # Store both types of embeddings
        for i, (book_id, _, _, _, _) in enumerate(books):
            self.book_embeddings[book_id] = {
                'tfidf': tfidf_matrix[i],
                'bert': bert_embeddings[i] if bert_embeddings is not None else None
            }

    def _generate_association_rules(self, min_support: float = 0.01, min_confidence: float = 0.3):
        """Generate association rules from borrowing history"""
        try:
            # Get borrowing transactions (users and their borrowed books)
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT user_id, GROUP_CONCAT(book_id) as book_ids
                FROM issued_books
                GROUP BY user_id
                HAVING COUNT(book_id) > 1
            ''')
            
            # Convert to transaction format for Apriori
            transactions = []
            for _, book_ids in cursor.fetchall():
                transactions.append(set(map(int, book_ids.split(','))))
            
            if not transactions:
                return []
                
            # Convert to one-hot encoded DataFrame
            te = TransactionEncoder()
            te_ary = te.fit(transactions).transform(transactions)
            df = pd.DataFrame(te_ary, columns=te.columns_)
            
            # Generate frequent itemsets
            frequent_itemsets = apriori(df, min_support=min_support, use_colnames=True)
            
            # Generate association rules
            if not frequent_itemsets.empty:
                self.association_rules = association_rules(
                    frequent_itemsets, metric="confidence", min_threshold=min_confidence
                ).to_dict('records')
                
        except Exception as e:
            logger.error(f"Error generating association rules: {e}")
            self.association_rules = []

    def get_book_features(self) -> Dict[int, str]:
        """Get book features (title, author, category, description) for content-based filtering"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, title || ' ' || author || ' ' || category || ' ' || COALESCE(description, '') 
            FROM books
        ''')
        return {book_id: features for book_id, features in cursor.fetchall()}

    def get_association_recommendations(
        self, 
        user_id: int, 
        n_recommendations: int = 5
    ) -> List[int]:
        """
        Get recommendations using association rule mining
        
        Args:
            user_id: ID of the user
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of recommended book IDs
        """
        try:
            # Get user's borrowed books
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT DISTINCT book_id FROM issued_books 
                WHERE user_id = ?
            ''', (user_id,))
            user_books = [row[0] for row in cursor.fetchall()]
            
            if not user_books or not self.association_rules:
                return []
            
            # Find matching rules
            recommendations = {}
            for rule in self.association_rules:
                antecedents = set(rule['antecedents'])
                consequents = set(rule['consequents'])
                
                # If user has all items in antecedents
                if antecedents.issubset(user_books):
                    for book_id in consequents - set(user_books):
                        if book_id not in recommendations:
                            recommendations[book_id] = rule['confidence']
            
            # Sort by confidence and return top N
            recommended = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
            return [book_id for book_id, _ in recommended[:n_recommendations]]
            
        except Exception as e:
            logger.error(f"Error in association rule recommendations: {e}")
            return []
            
    def get_popular_recommendations(
        self, 
        user_id: int, 
        n_recommendations: int = 5
    ) -> List[int]:
        """
        Get popular books recommendations
        
        Args:
            user_id: ID of the user (unused, kept for consistency)
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of recommended book IDs
        """
        try:
            # Return cached popular books
            return [book['id'] for book in self.popular_books[:n_recommendations]]
        except Exception as e:
            logger.error(f"Error in popular recommendations: {e}")
            return []

    def content_based_filtering(
        self, 
        user_id: int, 
        n_recommendations: int = 5,
        use_bert: bool = True
    ) -> List[int]:
        """
        Enhanced content-based filtering using TF-IDF and BERT embeddings
        
        Args:
            user_id: ID of the user
            n_recommendations: Number of recommendations to return
            use_bert: Whether to use BERT embeddings (if available)
            
        Returns:
            List of recommended book IDs
        """
        try:
            # Get user's borrowed books (even without ratings)
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT DISTINCT book_id FROM issued_books 
                WHERE user_id = ?
            ''', (user_id,))
            user_books = [row[0] for row in cursor.fetchall()]
            
            if not user_books:
                # If user has no history, return popular books
                return [book['id'] for book in self.popular_books[:n_recommendations]]
            
            # Get all book IDs
            all_book_ids = list(self.book_embeddings.keys())
            
            # Calculate similarity scores
            scores = defaultdict(float)
            
            # For each book the user has interacted with
            for book_id in user_books:
                if book_id not in self.book_embeddings:
                    continue
                    
                # Get embeddings for the source book
                source_emb = self.book_embeddings[book_id]
                
                # Compare with all other books
                for target_id in all_book_ids:
                    if target_id == book_id or target_id in user_books:
                        continue
                        
                    # Calculate TF-IDF similarity
                    tfidf_sim = cosine_similarity(
                        source_emb['tfidf'], 
                        self.book_embeddings[target_id]['tfidf']
                    )[0][0]
                    
                    # Calculate BERT similarity if available
                    bert_sim = 0
                    if use_bert and source_emb['bert'] is not None:
                        bert_sim = cosine_similarity(
                            source_emb['bert'].reshape(1, -1),
                            self.book_embeddings[target_id]['bert'].reshape(1, -1)
                        )[0][0]
                    
                    # Combined score (weighted average)
                    combined_score = (
                        0.4 * tfidf_sim + 
                        (0.6 * bert_sim if use_bert else 0.6 * tfidf_sim)
                    )
                    
                    scores[target_id] = max(scores[target_id], combined_score)
            
            # Get top N recommendations
            recommended = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            return [book_id for book_id, _ in recommended[:n_recommendations]]
            
        except Exception as e:
            logger.error(f"Error in content-based filtering: {e}")
            # Fallback to popular books
            return [book['id'] for book in self.popular_books[:n_recommendations]]

    def hybrid_recommendation(
        self, 
        user_id: int, 
        n_recommendations: int = 5,
        use_bert: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Enhanced hybrid recommendation combining multiple approaches:
        1. Content-based filtering (40% weight)
        2. Association rule mining (40% weight)
        3. Popularity-based (20% weight)
        
        Args:
            user_id: ID of the user
            n_recommendations: Number of recommendations to return
            use_bert: Whether to use BERT embeddings
            
        Returns:
            List of recommended books with metadata and scores
        """
        try:
            # Get recommendations from all methods
            content_based = self.content_based_filtering(
                user_id, 
                n_recommendations * 3,  # Get more for combination
                use_bert=use_bert
            )
            
            association_based = self.get_association_recommendations(
                user_id,
                n_recommendations * 3
            )
            
            popular = self.get_popular_recommendations(
                user_id,
                n_recommendations * 2
            )
            
            # Combine scores with weights
            combined_scores = defaultdict(float)
            
            # Content-based (40% weight)
            for i, book_id in enumerate(content_based):
                combined_scores[book_id] += 0.4 * (1 - i/len(content_based))
                
            # Association rules (40% weight)
            for i, book_id in enumerate(association_based):
                combined_scores[book_id] += 0.4 * (1 - i/len(association_based))
                
            # Popularity (20% weight)
            for i, book_id in enumerate(popular):
                combined_scores[book_id] += 0.2 * (1 - i/len(popular))
            
            # Get book details for top recommendations
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            recommendations = []
            seen_books = set()
            
            # Sort by combined score
            for book_id, score in sorted(combined_scores.items(), 
                                       key=lambda x: x[1], 
                                       reverse=True):
                if book_id in seen_books:
                    continue
                    
                cursor.execute('''
                    SELECT id, title, author, category, 
                           COALESCE(description, '') as description,
                           COALESCE(cover_image, '') as cover_image, 
                           available_copies
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
                        'score': round(score, 2),
                        'recommendation_type': self._get_recommendation_type(
                            book[0], 
                            content_based,
                            association_based,
                            popular
                        )
                    })
                    seen_books.add(book_id)
                    
                    if len(recommendations) >= n_recommendations:
                        break
            
            # If we don't have enough recommendations, fill with popular books
            if len(recommendations) < n_recommendations:
                for book in self.popular_books:
                    if book['id'] not in seen_books:
                        recommendations.append({
                            'id': book['id'],
                            'title': book['title'],
                            'author': book['author'],
                            'category': book['category'],
                            'description': book.get('description', ''),
                            'cover_image': book.get('cover_image', ''),
                            'available_copies': book.get('available_copies', 1),
                            'score': 0.1,  # Low score for fallback
                            'recommendation_type': 'popular'
                        })
                        if len(recommendations) >= n_recommendations:
                            break
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in hybrid recommendation: {e}")
            # Fallback to popular books
            return [{
                'id': book['id'],
                'title': book['title'],
                'author': book['author'],
                'category': book['category'],
                'description': book.get('description', ''),
                'cover_image': book.get('cover_image', ''),
                'available_copies': book.get('available_copies', 1),
                'score': 0.1,
                'recommendation_type': 'popular'
            } for book in self.popular_books[:n_recommendations]]
    
    def _get_recommendation_type(
        self, 
        book_id: int, 
        content_based: List[int],
        association_based: List[int],
        popular: List[int]
    ) -> str:
        """Determine which recommendation type was most influential"""
        if book_id in content_based and book_id in association_based:
            return 'hybrid_content_association'
        elif book_id in content_based:
            return 'content_based'
        elif book_id in association_based:
            return 'association_rules'
        elif book_id in popular:
            return 'popular'
        return 'general'
