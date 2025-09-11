import fs from 'fs';

export async function POST({ request }: { request: Request }) { 
    try {
        const formData = await request.formData(); // Change this line
        
        const images = formData.getAll('images') as File[];
        const format = formData.get('format') as string || 'base64';
        const include_info = formData.get('include_info') === 'true';
        
        if (!images || images.length === 0) {
            return Response.json({ error: 'No images provided' }, { status: 400 });
        }

        // Create FormData for Python API
        const pythonFormData = new FormData();
        images.forEach((file, index) => {
            pythonFormData.append('images', file, `image_${index}.jpg`);
        });
        pythonFormData.append('format', format);
        pythonFormData.append('include_info', include_info.toString());

        // Forward to Python API
        const response = await fetch('http://localhost:5000/api/remove-background-batch', {
            method: 'POST',
            body: pythonFormData
        });
        
        if (!response.ok) {
            const errorResult = await response.json();
            return Response.json(errorResult, { status: response.status });
        }
        
        const result = await response.json();
        fs.writeFileSync('image.png', JSON.stringify(result.images, null, 2)); // Debugging line
        return Response.json(result);
        
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: 'Server error' }, { status: 500 });
    }
}