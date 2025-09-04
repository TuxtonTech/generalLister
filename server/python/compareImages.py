from PIL import Image
from io import BytesIO
from typing import List, Dict
from sentence_transformers import SentenceTransformer, util
import torch
import logging

class ImageSimilarityComparer:
    def __init__(self, model_name: str = 'clip-ViT-B-32'):
        """Initialize the image similarity comparer with CLIP model"""
        print(f'Loading CLIP Model: {model_name}...')
        self.model = SentenceTransformer(model_name)
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Set device for optimal performance
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model.to(self.device)
        print(f'Using device: {self.device}')
    
    def _bytes_to_image(self, image_bytes: bytes) -> Image.Image:
        """Convert bytes to PIL Image and ensure RGB format"""
        try:
            image = Image.open(BytesIO(image_bytes))
            # Convert to RGB if needed (handles RGBA, P, etc.)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            return image
        except Exception as e:
            self.logger.error(f"Error converting bytes to image: {e}")
            raise ValueError(f"Invalid image data: {e}")
    
    def _encode_images(self, images: List[Image.Image], batch_size: int = 32) -> torch.Tensor:
        """Encode images using CLIP model"""
        try:
            return self.model.encode(
                images, 
                batch_size=batch_size, 
                convert_to_tensor=True, 
                show_progress_bar=len(images) > 10,
                device=self.device
            )
        except Exception as e:
            self.logger.error(f"Error encoding images: {e}")
            raise
    
    def compare_images(self, target_image: bytes, comparison_images: List[bytes]) -> List[Dict]:
        """
        Compare target image against comparison images
        
        Args:
            target_image: bytes - Target image as bytes
            comparison_images: List[bytes] - List of comparison images as bytes
            
        Returns:
            List[Dict] - Results sorted by similarity score (highest first)
                Each dict contains: {'index': int, 'score': float}
        """
        try:
            self.logger.info(f"Processing 1 target image and {len(comparison_images)} comparison images")
            
            # Convert bytes to PIL Images
            target_img = self._bytes_to_image(target_image)
            comparison_imgs = [self._bytes_to_image(img_bytes) for img_bytes in comparison_images]
            
            # Encode images
            self.logger.info("Encoding images...")
            target_embedding = self._encode_images([target_img])
            comparison_embeddings = self._encode_images(comparison_imgs)
            
            # Calculate similarities using cosine similarity
            similarities = util.cos_sim(target_embedding, comparison_embeddings)[0]
            
            # Create results
            results = [
                {'index': idx, 'score': float(score)}
                for idx, score in enumerate(similarities.cpu().numpy())
            ]
            
            # Sort by score (highest first)
            results.sort(key=lambda x: x['score'], reverse=True)
            
            self.logger.info(f"Comparison complete. Best match: index {results[0]['index']} with score {results[0]['score']:.4f}")
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error in compare_images: {e}")
            raise
    
    def get_best_match(self, target_image: bytes, comparison_images: List[bytes]) -> Dict:
        """
        Get the single best matching image
        
        Returns:
            Dict with keys: 'best_index', 'best_score'
        """
        results = self.compare_images(target_image, comparison_images)
        
        if not results:
            return {'best_index': None, 'best_score': 0.0}
        
        best = results[0]
        return {
            'best_index': best['index'],
            'best_score': best['score']
        }