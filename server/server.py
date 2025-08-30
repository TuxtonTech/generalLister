from flask import Flask, request, jsonify
from python.compareImages import PNGSimilarityComparer

app = Flask(__name__)
comparer = PNGSimilarityComparer()

@app.route('/api/compare', methods=['POST'])
def compare_images():
    data = request.json
    target_image = data.get('target_image')
    comparison_images = data.get('comparison_images')

    if not target_image or not comparison_images:
        return jsonify({'error': 'Both target_image and comparison_images are required.'}), 400

    try:
        formatted_images = [comparer.convert_any_image_to_png(img) for img in comparison_images]
        formatted_target = comparer.convert_any_image_to_png(target_image)
        results = comparer.compare_png(formatted_target, formatted_images)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('api/best-match', methods=['POST'])
def best_match():
    data = request.json
    target_image = data.get('target_image')
    comparison_images = data.get('comparison_images')

    if not target_image or not comparison_images:
        return jsonify({'error': 'Both target_image and comparison_images are required.'}), 400

    try:
        best = comparer.find_best_match(target_image, comparison_images)
        return jsonify(best)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)