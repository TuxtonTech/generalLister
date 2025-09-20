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
            cropped_img = original_image[y1:y2, x1:x2]
            
            # 5. Store the cropped image and its label in a new dictionary
            if cropped_img.size > 0:
                cropped_results.append({'label': label, 'image': cropped_img})
        
        return cropped_results

    def summarize_text(self, image_objects: List[Dict]) -> List[Dict] | str:
        """
        Extracts and summarizes text from a list of cropped image objects.
        """
        summary_list = []
        for obj in image_objects:
            label = obj['label']
            image_data = obj['image']
            
            # --- NEW: Image Pre-processing for better OCR ---
            # 1. Convert the image to grayscale
            gray_image = cv2.cvtColor(image_data, cv2.COLOR_BGR2GRAY)

            # 2. Apply adaptive thresholding to create a clean black & white image
            # This helps Tesseract distinguish text from the background
            binary_image = cv2.adaptiveThreshold(
                gray_image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
            
            pil_image = Image.fromarray(binary_image)
            
            try:
                # We will try a different Page Segmentation Mode (PSM)
                # --psm 6 assumes a single uniform block of text.
                custom_config = r'--psm 6'
                extracted_text = pytesseract.image_to_string(pil_image, config=custom_config)
                
                clean_text = extracted_text.strip()
                
                if clean_text:
                    summary_list.append({label: clean_text})

            except pytesseract.TesseractNotFoundError:
                return "Tesseract Error: The Tesseract-OCR engine is not installed or not in your PATH."
            except Exception as e:
                print(f"An error occurred during OCR for label '{label}': {e}")
        
        return summary_list
