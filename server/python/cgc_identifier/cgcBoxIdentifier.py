from typing import List, Dict, Optional
from ultralytics import YOLO
import cv2
import numpy as np

class CGCIdentifier:
    """
    A class to identify and process objects in images using a YOLOv8 model,
    specifically tailored for CGC-graded comics.
    """
    def __init__(self, model_path: str):
        """
        Initializes the CGCIdentifier with a trained YOLOv8 model.
        
        Args:
            model_path (str): The path to the trained YOLOv8 model file (e.g., 'best.pt').
        """
        try:
            self.model = YOLO(model_path)
            # Store class names for easy lookup
            self.class_names = self.model.names
        except Exception as e:
            print(f"Error loading model from {model_path}: {e}")
            raise

    def identify_cgc(self, 
                     binary_image: bytes, 
                     conf_threshold: float = 0.5, 
                     target_classes: Optional[List[str]] = None) -> List[Dict]:
        """
        Identifies objects in the provided binary image data, with filtering options.
        
        Args:
            binary_image (bytes): Image data in bytes.
            conf_threshold (float): The minimum confidence score to include a detection. Defaults to 0.5.
            target_classes (Optional[List[str]]): A list of class names to filter by. 
                                                  If None, all classes are considered. Defaults to None.
                                                  
        Returns:
            List[Dict]: A list of detected objects. Each dictionary contains:
                        {'box': [x1, y1, x2, y2], 'confidence': float, 'label': str}
        """
        try:
            # Decode the binary image data into a NumPy array
            nparr = np.frombuffer(binary_image, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                print("Error: Could not decode binary image data.")
                return []

            # Run prediction
            results = self.model(image, verbose=False) # Set verbose=False for cleaner output
            
            detections = []
            for r in results:
                for box in r.boxes:
                    confidence = box.conf[0].item()
                    
                    # Apply confidence threshold filtering
                    if confidence >= conf_threshold:
                        class_id = int(box.cls[0].item())
                        label = self.class_names[class_id]
                        
                        # Apply class name filtering
                        if target_classes is None or label in target_classes:
                            x1, y1, x2, y2 = box.xyxy[0].tolist()
                            
                            detections.append({
                                'box': [x1, y1, x2, y2],
                                'confidence': confidence,
                                'label': label
                            })
                            
            return detections
        except Exception as e:
            print(f"Error during CGC identification: {e}")
            return [] # Return empty list on error instead of raising
        

if __name__ == "__main__":
    # Example usage
    identifier = CGCIdentifier(model_path='./cgc_identifier_model2/weights/best.pt')
    
    # Load an example image file as binary data
    with open('1.png', 'rb') as img_file:
        image_bytes = img_file.read()
    
    results = identifier.identify_cgc(image_bytes, conf_threshold=0.6, target_classes=['cgc_grade', 'comic_issue', 'comic_book'])
    
    for detection in results:
        print(detection)