import 'dotenv/config';  // This loads your .env file
import { handler } from './build/handler.js';
import { createServer } from 'http';

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

createServer(handler).listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
});