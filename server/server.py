from flask import Flask, request, jsonify
from python.compareImages import ImageSimilarityComparer
from python.backgroundRemover import BackgroundRemover  # Import the new class
import logging
import base64

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize services once at startup
print("Initializing services...")

print("Loading Image Similarity Comparer...")
comparer = ImageSimilarityComparer(model_name='clip-ViT-B-32')

print("Loading Background Remover...")
bg_remover = BackgroundRemover(model_name='briaai/RMBG-1.4')

print("Server ready!")

def process_image_data(image_data):
    """Convert various input formats to bytes"""
    if isinstance(image_data, list):
        # Convert list of integers to bytes
        return bytes(image_data)
    elif isinstance(image_data, str):
        # Handle base64 encoded images
        try:
            return base64.b64decode(image_data)
        except:
            raise ValueError("Invalid base64 image data")
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

@app.route('/api/remove-background', methods=['POST'])
def remove_background():
    """Remove background from a single image (supports both JSON and form data)"""
    try:
        # Handle form data (multipart/form-data)
        if request.content_type and 'multipart/form-data' in request.content_type:
            if 'image' not in request.files:
                return jsonify({'error': 'No image file provided'}), 400
            
            file = request.files['image']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Read binary data
            image_bytes = file.read()
            return_format = request.form.get('format', 'base64')
            include_info = request.form.get('include_info', 'false').lower() == 'true'
            
        # Handle JSON data
        else:
            data = request.json
            
            # Validate input
            if not data:
                return jsonify({'error': 'No JSON data provided'}), 400
            
            image_data = data.get('image')
            return_format = data.get('format', 'base64')
            include_info = data.get('include_info', False)
            
            if not image_data:
                return jsonify({'error': 'image is required'}), 400
            
            # Process image
            image_bytes = process_image_data(image_data)
        
        if return_format not in ['base64', 'bytes', 'file']:
            return jsonify({'error': 'format must be "base64", "bytes", or "file"'}), 400
        
        # Get image info if requested
        image_info = None
        if include_info:
            image_info = bg_remover.get_image_info(image_bytes)
        
        # Remove background
        result = bg_remover.remove_background(image_bytes, return_format='bytes')
        
        response_data = {
            'success': True,
            'original_format': bg_remover.detect_image_format(image_bytes)
        }
        
        if include_info:
            response_data['image_info'] = image_info
        
        # Handle different return formats
        if return_format == 'base64':
            result_b64 = base64.b64encode(result).decode('utf-8')
            response_data['format'] = 'base64'
            response_data['image'] = result_b64
            return jsonify(response_data)
            
        elif return_format == 'bytes':
            response_data['format'] = 'bytes'
            response_data['image'] = list(result)  # Convert bytes to list for JSON
            return jsonify(response_data)
            
        else:  # return_format == 'file'
            # Return as downloadable file
            return send_file(
                io.BytesIO(result),
                mimetype='image/png',
                as_attachment=True,
                download_name='background_removed.png'
            )
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Server error in remove_background: {e}")
        return jsonify({'error': 'Internal server error occurred'}), 500

@app.route('/api/remove-background-batch', methods=['POST'])
def remove_background_batch():
    """Remove background from multiple images (supports both JSON and form data)"""
    try:
        # Handle form data (multipart/form-data)
        files = request.files.getlist('images')
        if not files:
            return jsonify({'error': 'No image files provided'}), 400
        
        # Read all files
        image_bytes_list = []
        for file in files:
            if file.filename != '':
                image_bytes_list.append(file.read())
        
        if not image_bytes_list:
            return jsonify({'error': 'No valid files provided'}), 400
        
        return_format = request.form.get('format', 'base64')
        include_info = request.form.get('include_info', 'false').lower() == 'true'
        
        if return_format not in ['base64', 'bytes']:
            return jsonify({'error': 'format must be "base64" or "bytes" for batch processing'}), 400
        
        # Remove backgrounds
        results = bg_remover.process_multiple_images(image_bytes_list, return_format=return_format)
        
        # Add image info and format results for JSON response
        for i, result in enumerate(results):
            if result['success']:
                result['original_format'] = bg_remover.detect_image_format(image_bytes_list[i])
                
                if include_info:
                    result['image_info'] = bg_remover.get_image_info(image_bytes_list[i])
                
                if return_format == 'bytes':
                    result['image'] = list(result['image'])  # Convert bytes to list for JSON
        
        return jsonify({
            'success': True,
            'results': results,
            'total_processed': len(image_bytes_list),
            'format': return_format
        })
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Server error in remove_background_batch: {e}")
        return jsonify({'error': 'Internal server error occurred'}), 500

@app.route('/api/image-info', methods=['POST'])
def get_image_info():
    """Get information about an image without processing it"""
    try:
        # Handle form data
        if request.content_type and 'multipart/form-data' in request.content_type:
            if 'image' not in request.files:
                return jsonify({'error': 'No image file provided'}), 400
            
            file = request.files['image']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            image_bytes = file.read()
            
        # Handle JSON data
        else:
            data = request.json
            if not data or not data.get('image'):
                return jsonify({'error': 'image is required'}), 400
            
            image_bytes = process_image_data(data.get('image'))
        
        # Get image info
        image_info = bg_remover.get_image_info(image_bytes)
        
        return jsonify({
            'success': True,
            'image_info': image_info
        })
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Server error in get_image_info: {e}")
        return jsonify({'error': 'Internal server error occurred'}), 500


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