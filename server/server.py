from flask import Flask, request, jsonify
from python.compareImages import ImageSimilarityComparer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize comparer once at startup
print("Initializing Image Similarity Comparer...")
comparer = ImageSimilarityComparer(model_name='clip-ViT-B-32')
print("Server ready!")

def process_image_data(image_data):
    """Convert various input formats to bytes"""
    if isinstance(image_data, list):
        # Convert list of integers to bytes
        return bytes(image_data)
    elif isinstance(image_data, bytes):
        return image_data
    else:
        raise ValueError(f"Unsupported image data type: {type(image_data)}")

@app.route('/api/compare', methods=['POST'])
def compare_images():
    """Compare target image against multiple comparison images"""
    try:
        data = request.json
        
        # Validate input
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        target_image = data.get('target_image')
        comparison_images = data.get('comparison_images')
        
        if not target_image:
            return jsonify({'error': 'target_image is required'}), 400
        if not comparison_images or not isinstance(comparison_images, list):
            return jsonify({'error': 'comparison_images must be a non-empty list'}), 400
        
        # Process images
        target_bytes = process_image_data(target_image)
        comparison_bytes = [process_image_data(img) for img in comparison_images]
        
        # Compare images
        results = comparer.compare_images(target_bytes, comparison_bytes)
        
        return jsonify({
            'success': True,
            'results': results,
            'total_comparisons': len(comparison_images)
        })
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Server error in compare_images: {e}")
        return jsonify({'error': 'Internal server error occurred'}), 500

@app.route('/api/best-match', methods=['POST'])
def best_match():
    """Get the single best matching image"""
    try:
        data = request.json
        
        # Validate input
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        target_image = data.get('target_image')
        comparison_images = data.get('comparison_images')
        
        if not target_image:
            return jsonify({'error': 'target_image is required'}), 400
        if not comparison_images or not isinstance(comparison_images, list):
            return jsonify({'error': 'comparison_images must be a non-empty list'}), 400
        
        # Process images
        target_bytes = process_image_data(target_image)
        comparison_bytes = [process_image_data(img) for img in comparison_images]
        
        # Get best match
        result = comparer.get_best_match(target_bytes, comparison_bytes)
        
        return jsonify({
            'success': True,
            'best_match': result,
            'total_comparisons': len(comparison_images)
        })
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Server error in best_match: {e}")
        return jsonify({'error': 'Internal server error occurred'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': 'clip-ViT-B-32',
        'device': comparer.device
    })

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

if __name__ == '__main__':
    app.run(
        debug=False,  # Set to False for production
        host='0.0.0.0',  # Allow external connections
        port=5000,
        threaded=True  # Handle multiple requests
    )