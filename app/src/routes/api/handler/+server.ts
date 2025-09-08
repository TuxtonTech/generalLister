// import type { RequestHandler } from './$types';

// export const POST: RequestHandler = async ({ request }) => {
//     try {
//         console.log('BODY_SIZE_LIMIT env var:', process.env.BODY_SIZE_LIMIT);
//         // Check content length - set to 10MB (adjust as needed)
//         const contentLength = request.headers.get('content-length');
//         const maxSize = 50 * 1024 * 1024; // 10MB in bytes
        
//         if (contentLength && parseInt(contentLength) > maxSize) {
//             return new Response('File too large', { status: 413 });
//         }
        
//         const formData = await request.formData();
//         const file = formData.get('image') as File; // or whatever your field name is
        
//         if (!file) {
//             return new Response('No file provided', { status: 400 });
//         }
        
//         console.log(`Received file: ${file.name}, size: ${file.size} bytes`);
        
//         // Process your file here...
        
//         return new Response(JSON.stringify({ 
//             success: true,
//             filename: file.name,
//             size: file.size 
//         }), {
//             headers: { 'Content-Type': 'application/json' }
//         });
        
//     } catch (error) {
//         console.error('Upload error:', error);
//         return new Response('Upload failed', { status: 500 });
//     }
// };