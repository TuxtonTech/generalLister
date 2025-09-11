import torch
import torchvision.transforms as transforms
from transformers import AutoModelForImageSegmentation
from PIL import Image
import numpy as np
import io
import logging

logger = logging.getLogger(__name__)

class BackgroundRemover:
    """Background removal using RMBG-1.4 model"""
    
    def __init__(self, model_name='briaai/RMBG-1.4'):
        """
        Initialize the background remover
        
        Args:
            model_name (str): Hugging Face model name
        """
        self.model_name = model_name
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        logger.info(f"Loading background removal model: {model_name}")
        logger.info(f"Using device: {self.device}")
        
        try:
            # Load the model
            self.model = AutoModelForImageSegmentation.from_pretrained(
                model_name, 
                trust_remote_code=True
            )
            self.model.to(self.device)
            self.model.eval()
            
            # Define image transforms
            self.transform_image = transforms.Compose([
                transforms.Resize((1024, 1024)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            
            logger.info("Background removal model loaded successfully!")
            
        except Exception as e:
            logger.error(f"Failed to load background removal model: {e}")
            raise
    
    def preprocess_image(self, image_data):
        """
        Convert image data to PIL Image
        
        Args:
            image_data (bytes or PIL.Image): Input image data
            
        Returns:
            PIL.Image: Preprocessed image
        """
        try:
            if isinstance(image_data, bytes):
                image = Image.open(io.BytesIO(image_data)).convert('RGB')
            elif isinstance(image_data, Image.Image):
                image = image.convert('RGB')
            else:
                raise ValueError(f"Unsupported image data type: {type(image_data)}")
            
            return image
            
        except Exception as e:
            logger.error(f"Failed to preprocess image: {e}")
            raise ValueError(f"Invalid image data: {str(e)}")
    
    def remove_background(self, image_data, return_format='bytes'):
        """
        Remove background from image
        
        Args:
            image_data (bytes or PIL.Image): Input image
            return_format (str): 'bytes', 'pil', or 'base64'
            
        Returns:
            bytes, PIL.Image, or str: Image with background removed
        """
        try:
            # Preprocess image
            original_image = self.preprocess_image(image_data)
            original_size = original_image.size
            
            # Calculate padding to make image square while preserving aspect ratio
            width, height = original_size
            max_dim = max(width, height)
            
            # Create a square canvas and paste the image centered
            square_image = Image.new('RGB', (max_dim, max_dim), (0, 0, 0))
            
            # Calculate position to center the image
            left = (max_dim - width) // 2
            top = (max_dim - height) // 2
            square_image.paste(original_image, (left, top))
            
            # Store the padding info for later cropping
            padding_info = {
                'left': left,
                'top': top,
                'original_width': width,
                'original_height': height,
                'padded_size': max_dim
            }
            
            # Transform the square image for model
            input_images = self.transform_image(square_image).unsqueeze(0).to(self.device)
            
            # Predict mask
            with torch.no_grad():
                preds = self.model(input_images)
    
                # Handle different return types from the model
                if isinstance(preds, (list, tuple)):
                    # Debug: Print shapes of all outputs to find the right one
                    logger.info(f"Model returned {len(preds)} outputs")
                    for i, pred in enumerate(preds):
                        if isinstance(pred, torch.Tensor):
                            logger.info(f"Output {i}: shape {pred.shape}")
                        elif isinstance(pred, list):
                            logger.info(f"Output {i}: list with {len(pred)} items")
                            if len(pred) > 0 and isinstance(pred[0], torch.Tensor):
                                logger.info(f"  First item shape: {pred[0].shape}")
                    
                    # Try to find the segmentation mask output
                    # Usually it's a tensor with shape [batch_size, 1, height, width]
                    pred_tensor = None
                    for pred in preds:
                        if isinstance(pred, torch.Tensor):
                            # Look for tensor with 1 channel (segmentation mask)
                            if len(pred.shape) == 4 and pred.shape[1] == 1:
                                pred_tensor = pred
                                break
                        elif isinstance(pred, list) and len(pred) > 0:
                            for item in pred:
                                if isinstance(item, torch.Tensor) and len(item.shape) == 4 and item.shape[1] == 1:
                                    pred_tensor = item
                                    break
                            if pred_tensor is not None:
                                break
                            
                    # If we still don't have it, try the first tensor output
                    if pred_tensor is None:
                        for pred in preds:
                            if isinstance(pred, torch.Tensor):
                                pred_tensor = pred
                                break
                            elif isinstance(pred, list) and len(pred) > 0 and isinstance(pred[0], torch.Tensor):
                                pred_tensor = pred[0]
                                break
                            
                    if pred_tensor is None:
                        raise RuntimeError("Could not find valid prediction tensor in model output")
    
                    # Apply sigmoid and move to CPU
                    pred_tensor = torch.sigmoid(pred_tensor).cpu()
                else:
                    # If it's already a tensor
                    pred_tensor = torch.sigmoid(preds).cpu()
    
            # Process mask - handle the padding we added
            pred = pred_tensor[0].squeeze()
            
            # Debug logging
            logger.info(f"Original image size: {original_size}")
            logger.info(f"Prediction tensor shape: {pred.shape}")
            
            pred_pil = transforms.ToPILImage()(pred)
            logger.info(f"Prediction PIL size: {pred_pil.size}")
            
            # Resize the square mask to the padded size
            padded_mask = pred_pil.resize((padding_info['padded_size'], padding_info['padded_size']), Image.LANCZOS)
            
            # Crop out the padding to get back to original aspect ratio
            mask = padded_mask.crop((
                padding_info['left'],
                padding_info['top'],
                padding_info['left'] + padding_info['original_width'],
                padding_info['top'] + padding_info['original_height']
            ))
            
            logger.info(f"Final mask size: {mask.size}")
            
            # Verify the mask is the right size
            assert mask.size == original_size, f"Mask size {mask.size} doesn't match original {original_size}"
            
            # Create output image with transparent background
            output_image = Image.new("RGBA", original_size, (0, 0, 0, 0))
            
            # Convert original to RGBA if needed
            if original_image.mode != 'RGBA':
                original_image = original_image.convert('RGBA')
            
            # Apply mask
            mask_array = np.array(mask)
            original_array = np.array(original_image)
            output_array = original_array.copy()
            
            # Set alpha channel based on mask
            output_array[:, :, 3] = mask_array
            
            output_image = Image.fromarray(output_array, 'RGBA')
            
            # Return in requested format
            if return_format == 'pil':
                return output_image
            elif return_format == 'base64':
                import base64
                buffer = io.BytesIO()
                output_image.save(buffer, format='PNG')
                buffer.seek(0)
                return base64.b64encode(buffer.getvalue()).decode('utf-8')
            else:  # return_format == 'bytes'
                buffer = io.BytesIO()
                output_image.save(buffer, format='PNG')
                buffer.seek(0)
                return buffer.getvalue()
                
        except Exception as e:
            logger.error(f"Failed to remove background: {e}")
            raise RuntimeError(f"Background removal failed: {str(e)}")
    def process_multiple_images(self, image_list, return_format='bytes'):
        """
        Remove background from multiple images
        
        Args:
            image_list (list): List of image data
            return_format (str): 'bytes', 'pil', or 'base64'
            
        Returns:
            list: List of processed images
        """
        results = []
        
        for i, image_data in enumerate(image_list):
            try:
                result = self.remove_background(image_data, return_format)
                results.append({
                    'index': i,
                    'success': True,
                    'image': result
                })
            except Exception as e:
                logger.error(f"Failed to process image {i}: {e}")
                results.append({
                    'index': i,
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    def get_model_info(self):
        """Get information about the loaded model"""
        return {
            'model_name': self.model_name,
            'device': str(self.device),
            'model_type': 'background_removal'
        }
    
    def detect_image_format(self, image_bytes):
        """Detect the format of the image from bytes"""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            return image.format.lower() if image.format else 'unknown'
        except Exception:
            return 'unknown'
    
    def get_image_info(self, image_bytes):
        """Get information about the image"""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            return {
                'width': image.width,
                'height': image.height,
                'mode': image.mode,
                'format': image.format,
                'size_bytes': len(image_bytes)
            }
        except Exception as e:
            return {'error': str(e)}