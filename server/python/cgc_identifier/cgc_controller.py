import os
from .cgcBoxIdentifier import CGCIdentifier
# The import below is corrected to be a "relative" import.
# The '.' tells Python to look in the current directory for the module.
from .image_to_text import ImageToText

class GradeDetector:
    def __init__(self):
        # Determine the absolute path to the model file
        # This ensures the model is found regardless of the script's working directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'cgc_identifier_model2', 'weights', 'best.pt')
        
        self.identifier = CGCIdentifier(model_path=model_path)
        self.image_to_text = ImageToText()

    def process_image(self, image_bytes):
        try:
            # The rest of the function remains the same
            identifier = self.identifier
            
            # This logic appears to be from a different version of the file.
            # I am commenting it out to align with the class structure.
            # image, boxes = identifier.get_bounding_boxes(image_bytes)
            
            # Assuming the goal is to use the identifier and image_to_text instances
            results = identifier.identify_cgc(image_bytes, conf_threshold=0.6)
            graded = any(d['label'] in ['cgc_grade', 'cgc_slab'] for d in results)

            if graded:
                items_to_process = [d for d in results if d['label'] in ['cgc_grade', 'comic_issue']]
                cropped_objects = self.image_to_text.crop_objects(image_bytes, items_to_process)
                summary = self.image_to_text.summarize_text(cropped_objects)
                return summary
            else:
                return "No grade box detected."

        except Exception as e:
            print(f"Error in grade detection processing: {e}")
            # It might be good to return an error message or re-raise
            return f"Error processing image: {e}"
