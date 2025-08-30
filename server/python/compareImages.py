from venv import logger
from PIL import Image
from io import BytesIO
from typing import List, Dict, Optional, Union
from sentence_transformers import SentenceTransformer, util
import torch
import numpy as np
import logging
import os
import imghdr
from PIL import Image

class PNGSimilarityComparer:
    def __init__(self, model_name: str = 'clip-ViT-B-32', threshold_duplicate: float = 0.999, threshold_similar: float = 0.95):
        print(f'Loading CLIP Model: {model_name}...')
        self.model = SentenceTransformer(model_name)
        self.threshold_duplicate = threshold_duplicate
        self.threshold_similar = threshold_similar
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def _buffer_to_image(self, png_buffer: bytes) -> Image.Image:
        """Convert PNG buffer to PIL Image"""
        return Image.open(BytesIO(png_buffer))
    
    def _encode_images(self, images: List[Image.Image], batch_size: int = 32) -> torch.Tensor:
        """Encode images using CLIP model"""
        return self.model.encode(
            images, 
            batch_size=batch_size, 
            convert_to_tensor=True, 
            show_progress_bar=len(images) > 10
        )
    
    def compare_png(self,
                    target_png: bytes,
                    comparison_pngs: List[bytes],
                    batch_size: int = 32) -> List[Dict]:
        """
        Compare a target PNG buffer against an array of PNG buffers

        Args:
            target_png: bytes - The PNG image buffer to compare
            comparison_pngs: List[bytes] - Array of PNG image buffers to compare against
            batch_size: int - Batch size for processing

        Returns:
            A list of dictionaries, where each dictionary contains the 'index'
            of the comparison image and its 'score' (confidence).
            The list is sorted from highest to lowest score.
        """
        try:
            self.logger.info(f"Converting target PNG and {len(comparison_pngs)} comparison PNGs...")

            # Convert buffers to images
            target_image = self._buffer_to_image(target_png)
            comparison_images = [self._buffer_to_image(png_buf) for png_buf in comparison_pngs]

            # Encode images
            self.logger.info("Encoding target image...")
            target_embedding = self._encode_images([target_image], batch_size=1)

            self.logger.info(f"Encoding {len(comparison_images)} comparison images...")
            comparison_embeddings = self._encode_images(comparison_images, batch_size=batch_size)

            # Calculate similarities
            self.logger.info("Calculating similarities...")
            similarities = util.cos_sim(target_embedding, comparison_embeddings)[0]
            similarities_np = similarities.cpu().numpy()

            # Create indexed results
            indexed_results = [
                {'score': float(score), 'index': idx}
                for idx, score in enumerate(similarities_np)
            ]
            indexed_results.sort(key=lambda x: x['score'], reverse=True)
            
            self.logger.info(f"Top match score: {indexed_results[0]['score']:.3f}")

            return indexed_results

        except Exception as e:
            self.logger.error(f"Error in compare_png(): {str(e)}")
            raise


    def find_best_match(self, target_png: bytes, comparison_pngs: List[bytes]) -> Dict:
        """
        Simple method to find the single best match
        
        Returns:
            Dict with keys: 'best_match_index', 'best_score', 'is_duplicate', 'is_similar'
        """
        results = self.compare_png(target_png, comparison_pngs, return_top_n=1)
        
        if not results['top_matches']:
            return {'best_match_index': None, 'best_score': 0.0, 'is_duplicate': False, 'is_similar': False}
        
        best = results['top_matches'][0]
        
        return {
            'best_match_index': best['index'],
            'best_score': best['score'],
            'is_duplicate': best['score'] >= self.threshold_duplicate,
            'is_similar': best['score'] >= self.threshold_similar
        }


    def detect_format_from_buffer(self, buffer: bytes) -> str:
        """
        Detect image format from buffer using multiple methods

        Args:
            buffer: bytes - The image data as bytes

        Returns:
            str - detected format ('JPEG', 'PNG', 'GIF', 'BMP', 'WEBP', etc.) or 'UNKNOWN'
        """

        logger = logging.getLogger(__name__)
        if not buffer or len(buffer) < 4:
            return 'UNKNOWN'

        try:
            # Method 1: Use imghdr (built-in Python module)
            detected = imghdr.what(None, h=buffer)
            if detected:
                return detected.upper()

            # Method 2: Use PIL to detect format
            try:
                temp_image = Image.open(BytesIO(buffer))
                pil_format = temp_image.format
                temp_image.close()
                if pil_format:
                    return pil_format.upper()
            except Exception as e:
                logger.debug(f"PIL detection failed: {str(e)}")

            # Method 3: Check magic bytes manually for common formats
            magic_bytes_map = {
                # JPEG
                b'\xff\xd8\xff': 'JPEG',

                # PNG
                b'\x89PNG': 'PNG',

                # GIF
                b'GIF87a': 'GIF',
                b'GIF89a': 'GIF',

                # BMP
                b'BM': 'BMP',

                # TIFF
                b'II*\x00': 'TIFF',  # Little endian
                b'MM\x00*': 'TIFF',  # Big endian

                # WebP
                b'RIFF': 'WEBP',  # Need to check further for WebP

                # ICO
                b'\x00\x00\x01\x00': 'ICO',

                # TGA (less reliable)
                # TGA doesn't have a clear magic number, so we skip it here

                # PSD
                b'8BPS': 'PSD',
            }

            # Check magic bytes
            for magic, format_name in magic_bytes_map.items():
                if buffer.startswith(magic):
                    # Special case for WebP - need to check further
                    if format_name == 'WEBP':
                        if len(buffer) >= 12 and buffer[8:12] == b'WEBP':
                            return 'WEBP'
                        else:
                            continue  # False positive, keep checking
                    else:
                        return format_name

            # Method 4: Extended magic bytes check (check at different positions)
            extended_checks = {
                # Check for PSD at position 0
                b'8BPS': ('PSD', 0),

                # Check for additional JPEG markers
                b'\xff\xd8': ('JPEG', 0),  # More lenient JPEG check

                # Check for TARGA (TGA) - check footer
                # TGA files may have "TRUEVISION-XFILE." at the end
            }

            for magic, (format_name, position) in extended_checks.items():
                if len(buffer) > position + len(magic):
                    if buffer[position:position + len(magic)] == magic:
                        return format_name

            # Method 5: Check file footer for some formats (like TGA)
            if len(buffer) >= 26:
                tga_footer = b'TRUEVISION-XFILE.'
                if buffer[-18:] == tga_footer:
                    return 'TGA'

            logger.debug(f"Could not detect format for buffer of length {len(buffer)}, first 16 bytes: {buffer[:16].hex()}")
            return 'UNKNOWN'

        except Exception as e:
            logger.error(f"Error detecting buffer format: {str(e)}")
            return 'UNKNOWN'
    


    def convert_any_image_to_png(self, source: Union[str, bytes], quality: str = 'high', force_rgb: bool = False, max_size: Optional[tuple] = None) -> None:
    
        try:
            # Handle input source
            if isinstance(source, str):
                # File path input
                if not os.path.exists(source):
                    raise FileNotFoundError(f"File not found: {source}")

                with open(source, 'rb') as f:
                    image_buffer = f.read()

                # Detect format for logging
                detected_format = self.detect_format_from_buffer(image_buffer)
                logger.info(f"Loading {source} - detected format: {detected_format}")

            elif isinstance(source, bytes):
                # Buffer input
                image_buffer = source
                detected_format = self.detect_format_from_buffer(image_buffer)
                logger.info(f"Processing buffer - detected format: {detected_format}")

            else:
                raise ValueError("Source must be file path (str) or image buffer (bytes)")

            # Open image with PIL
            image = Image.open(BytesIO(image_buffer))
            original_format = image.format
            original_mode = image.mode
            original_size = image.size

            logger.info(f"Original: {original_format}, Mode: {original_mode}, Size: {original_size}")

            # Handle different image modes for PNG conversion
            if force_rgb:
                # Force RGB (removes transparency)
                if image.mode != 'RGB':
                    if image.mode in ('RGBA', 'LA'):
                        # Create white background for transparent images
                        background = Image.new('RGB', image.size, (255, 255, 255))
                        if image.mode == 'RGBA':
                            background.paste(image, mask=image.split()[-1])  # Use alpha channel as mask
                        else:
                            background.paste(image)
                        image = background
                    else:
                        image = image.convert('RGB')
            else:
                # Preserve transparency when possible
                if image.mode == 'P':
                    # Palette mode - check for transparency
                    if 'transparency' in image.info:
                        image = image.convert('RGBA')
                    else:
                        image = image.convert('RGB')
                elif image.mode in ('1', 'L'):
                    # Binary or grayscale
                    image = image.convert('RGB')
                elif image.mode == 'LA':
                    # Grayscale with alpha
                    image = image.convert('RGBA')
                elif image.mode == 'CMYK':
                    # CMYK to RGB conversion
                    image = image.convert('RGB')
                # RGBA and RGB modes are already fine for PNG

            # Resize if max_size specified and image is larger
            if max_size and (image.size[0] > max_size[0] or image.size[1] > max_size[1]):
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
                logger.info(f"Resized to: {image.size}")

            # Set compression level
            compress_levels = {
                'high': 1,    # Best quality, larger file
                'medium': 6,  # Balanced
                'low': 9      # Most compression, smallest file
            }
            compress_level = compress_levels.get(quality.lower(), 6)

            # Save as PNG
            png_buffer = BytesIO()

            # Additional PNG save parameters for optimization
            save_kwargs = {
                'format': 'PNG',
                'compress_level': compress_level,
                'optimize': True
            }

            # Add specific optimizations for different cases
            if image.mode == 'P':
                save_kwargs['palette'] = image.getpalette()

            image.save(png_buffer, **save_kwargs)

            # Get the bytes and cleanup
            png_bytes = png_buffer.getvalue()
            png_buffer.close()
            image.close()

            compression_ratio = len(png_bytes) / len(image_buffer) if len(image_buffer) > 0 else 1
            logger.info(f"Conversion complete: {len(image_buffer)} → {len(png_bytes)} bytes "
                       f"({compression_ratio:.2f}x, {original_format} → PNG)")

            return png_bytes

        except Exception as e:
            logger.error(f"Error converting image to PNG: {str(e)}")
            raise


# Example usage:
if __name__ == "__main__":
    # Initialize the comparer
    comparer = PNGSimilarityComparer()
    
    # Example with file reading (you'd replace with your actual PNG buffers)
    def load_png_as_buffer(file_path: str) -> bytes:
        with open(file_path, 'rb') as f:
            return f.read()
    
    # Load your PNG buffers
    target_png_buffer = comparer.convert_any_image_to_png('./IMG_1703.PNG')
    comparison_png_buffers = [
        comparer.convert_any_image_to_png('./test1.jpeg'),
        comparer.convert_any_image_to_png('./test2.jpg'),
        comparer.convert_any_image_to_png('./test3.jpg'),
    ]
    
    # Compare images
    results = comparer.compare_png(target_png_buffer, comparison_png_buffers)
    
    # Print results
    