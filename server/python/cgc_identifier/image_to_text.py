import cv2
import numpy as np
import easyocr
from typing import Dict, List

class ImageToText:
    def __init__(self):
        """
        Initializes the ImageToText class using EasyOCR.
        This will download the necessary model files on the first run.
        """
        # Initialize the EasyOCR reader for English.
        # gpu=False ensures it runs on the CPU, which is fine for this task.
        self.reader = easyocr.Reader(['en'], gpu=False)

    def crop_objects(self, binaryImage: bytearray, detections: List[Dict]) -> List[Dict]:
        """
        Crops all detected objects from an image based on a list of bounding boxes.
        """
        numPyArray = np.frombuffer(binaryImage, np.uint8)
        original_image = cv2.imdecode(numPyArray, cv2.IMREAD_COLOR)

        if original_image is None:
            print("Error: Could not decode image from binary data.")
            return []

        cropped_results = []
        for detection in detections:
            coords = detection['box']
            label = detection['label']
            x1, y1, x2, y2 = map(int, coords)
            cropped_image_data = original_image[y1:y2, x1:x2]

            if cropped_image_data.size > 0:
                 cropped_results.append({
                    'label': label,
                    'image': cropped_image_data
                })

        return cropped_results
        
    def summarize_text(self, image_objects: List[Dict]) -> List[Dict] | str:
        """
        Performs OCR on a list of cropped image objects using EasyOCR.
        """
        summary_list = []
        for obj in image_objects:
            label = obj['label']
            image_data = obj['image']
            
            try:
                # EasyOCR reads the image data (NumPy array) directly.
                # It automatically handles the necessary color conversions.
                results = self.reader.readtext(image_data)
                
                # EasyOCR returns a list of (bbox, text, confidence). We just need the text.
                # We'll join all detected text fragments with a newline character for consistency.
                extracted_text = "\n".join([text for _, text, _ in results])

                clean_text = extracted_text.strip()
                
                if clean_text:
                    summary_list.append({label: clean_text})

            except Exception as e:
                print(f"An error occurred during EasyOCR for label '{label}': {e}")
                return f"EasyOCR Error: An unexpected error occurred: {e}"
        
        return summary_list

