from .cgcBoxIdentifier import CGCIdentifier
import cv2
import io

# Load an example image file as binary data
# with open('1.jpg', 'rb') as img_file:
#     image_bytes = img_file.read()
class GrabcgcGrading: 
    def __init__(self):
        pass

    def process_image(self, image_bytes):
        identifier = CGCIdentifier(model_path='./cgc_identifier_model2/weights/best.pt')
        graded=False
        confidence_threshold = 0.6

        results = identifier.identify_cgc(image_bytes, confidence_threshold)

        for detection in results:
            if detection['label'] == 'cgc_grade' or detection['label'] == 'cgc_authentication' or detection['label'] == 'cgc_slab' and detection['confidence'] > confidence_threshold:
                graded = True

        structured_info = {}
        if graded: 
            from image_to_text import ImageToText
            image_to_text = ImageToText()
            items_to_process = [detection for detection in results if detection['label'] in ['cgc_grade', 'comic_issue']]

            cropped_objects = image_to_text.crop_objects(image_bytes, items_to_process)
            summary = image_to_text.summarize_text(cropped_objects)
            structured_info = {}
            for item in summary:
                # Get the key (e.g., 'cgc_grade') and the full string value
                for key, value in item.items():
                    # Split the string by the double newline to separate main info from details
                    parts = value.split('\n\n')

                    # The first part is the primary value
                    primary_value = parts[0].strip()

                    # The second part (if it exists) is the secondary detail
                    secondary_detail = parts[1].strip() if len(parts) > 1 else None

                    # Store the cleaned data in the new dictionary
                    if key == 'cgc_grade':
                        structured_info[key] = parts[0].strip()
                    else: 
                        structured_info[key] = primary_value + "|" + secondary_detail  # Just the grade value
            print(structured_info)
        else:
            print("No grading detected, skipping.")

        return structured_info

