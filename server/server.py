from flask import Flask, request, jsonify
from python.compareImages import PNGSimilarityComparer

app = Flask(__name__)
comparer = PNGSimilarityComparer()

def list_to_bytes(data_list):
    """Convert a list of integers to bytes"""
    if isinstance(data_list, list):
        return bytes(data_list)
    return data_list  # Already bytes or other format

@app.route('/api/compare', methods=['POST'])
def compare_images():
    data = request.json
    target_image = data.get('target_image')
    comparison_images = data.get('comparison_images')

    if not target_image or not comparison_images:
        return jsonify({'error': 'Both target_image and comparison_images are required.'}), 400

    try:
        # Convert lists back to bytes
        target_bytes = list_to_bytes(target_image)
        comparison_bytes = [list_to_bytes(img) for img in comparison_images]
        
        # Now pass bytes to your comparer
        formatted_images = [comparer.convert_any_image_to_png(img) for img in comparison_bytes]
        formatted_target = comparer.convert_any_image_to_png(target_bytes)
        results = comparer.compare_png(formatted_target, formatted_images)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/best-match', methods=['POST'])
def best_match():
    data = request.json
    target_image = data.get('target_image')
    comparison_images = data.get('comparison_images')

    if not target_image or not comparison_images:
        return jsonify({'error': 'Both target_image and comparison_images are required.'}), 400

    try:
        # Convert lists back to bytes
        target_bytes = list_to_bytes(target_image)
        comparison_bytes = [list_to_bytes(img) for img in comparison_images]
        
        best = comparer.find_best_match(target_bytes, comparison_bytes)
        return jsonify(best)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)