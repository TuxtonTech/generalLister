import os
from .cgcBoxIdentifier import CGCIdentifier
from .image_to_text import ImageToText

class GrabcgcGrading: 
    def __init__(self):
        """
        Initializes the grading class.
        This is more efficient as the model and helpers are loaded only once.
        """
        # Build an absolute path to the model file to prevent FileNotFoundError
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'cgc_identifier_model2', 'weights', 'best.pt')
        
        self.identifier = CGCIdentifier(model_path=model_path)
        self.image_to_text = ImageToText()

    def process_image(self, image_bytes):
        """
        Processes a single image to find and extract grading information.
        """
        confidence_threshold = 0.6
        graded = False
        
        # Use the identifier instance created during initialization
        results = self.identifier.identify_cgc(image_bytes, confidence_threshold)

        # Check if any relevant labels indicate a graded comic
        for detection in results:
            if detection['label'] in ['cgc_grade', 'cgc_authentication', 'cgc_slab'] and detection['confidence'] > confidence_threshold:
                graded = True
                break  # Exit early once we confirm it's graded

        structured_info = {}
        if graded: 
            # Use the image_to_text instance created during initialization
            items_to_process = [d for d in results if d['label'] in ['cgc_grade', 'comic_issue']]

            cropped_objects = self.image_to_text.crop_objects(image_bytes, items_to_process)
            summary = self.image_to_text.summarize_text(cropped_objects)
            
            # Process the summary into the final structured format
            for item in summary:
                for key, value in item.items():
                    parts = value.split('\n\n')
                    primary_value = parts[0].strip()
                    secondary_detail = parts[1].strip() if len(parts) > 1 else None

                    if key == 'cgc_grade':
                        structured_info[key] = primary_value
                    elif secondary_detail:
                        structured_info[key] = f"{primary_value}|{secondary_detail}"
                    else:
                        structured_info[key] = primary_value
            print("Grading Info Found:", structured_info)
        else:
            print("No CGC grading detected in the image.")

        return structured_info

