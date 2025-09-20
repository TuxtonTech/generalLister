# Add these imports at the top of your file
import cv2
import numpy as np
import pytesseract
from PIL import Image
from typing import Dict, List

class ImageToText:
    def __init__(self, model_name: str = "tesseract"):
        # This part is a placeholder for potential future models.
        # For Tesseract, no client initialization is needed.
        self.model_name = model_name

    def crop_objects(self, binaryImage: bytearray, detections: List[Dict]) -> List[Dict]:
        """
        Crops all detected objects from an image based on a list of bounding boxes.
        (Your existing code for this method goes here...)
        """
        # 1. Decode the binary image data once
        numPyArray = np.frombuffer(binaryImage, np.uint8)
        original_image = cv2.imdecode(numPyArray, cv2.IMREAD_COLOR)

        if original_image is None:
            print("Error: Could not decode image from binary data.")
            return []

        cropped_results = []
        # 2. Loop through each detection dictionary in the list
        for detection in detections:
            # 3. Extract the coordinates and label for the current object
            coords = detection['box']
            label = detection['label']
            x1, y1, x2, y2 = map(int, coords)

            # 4. Crop the image using the bounding box coordinates
            # The slicing order is [y_start:y_end, x_start:x_end]
            cropped_image_data = original_image[y1:y2, x1:x2]

            # 5. Append the result in the desired format
            cropped_results.append({
                'label': label,
                'image': cropped_image_data
            })

        return cropped_results
        
    def summarize_text(self, image_objects: List[Dict]) -> str:
        """
        Performs OCR on a list of cropped image objects and returns a summarized string.

        Args:
            image_objects (List[Dict]): A list of dictionaries, where each contains
                                        a 'label' and 'image' (NumPy array).

        Returns:
            str: A formatted string containing the label and extracted text for each object.
        """
        summary_list = []
        # 1. Loop through each dictionary in the image_objects list
        for obj in image_objects:
            label = obj['label']
            image_data = obj['image']
            
            # 2. Convert the OpenCV image (BGR) to a PIL Image (RGB)
            # Pytesseract works best with PIL images.
            rgb_image = cv2.cvtColor(image_data, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_image)
            
            # 3. Use Pytesseract to extract text from the image
            try:
                extracted_text = pytesseract.image_to_string(pil_image)
                # Clean up the text by removing extra whitespace
                clean_text = extracted_text.strip()
                
                # 4. Format the output and add it to our summary list
                if clean_text: # Only add if OCR found some text
                    summary_list.append({label: clean_text})

            except pytesseract.TesseractNotFoundError:
                return "Tesseract Error: The Tesseract-OCR engine is not installed or not in your PATH."
            except Exception as e:
                print(f"An error occurred during OCR for label '{label}': {e}")
        
        # 5. Join all the individual summaries into a single string
        return summary_list
