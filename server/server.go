package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath" // Import path/filepath for path manipulation
	"time"

	"golang.org/x/net/websocket" // Using the extended standard library package for simplicity
)

// Define the directory where your Svelte app's built static files are located.
// Adjust this path relative to where your Go server executable will be run.
// If your Go server is in 'generalLister/server' and Svelte build output is in 'generalLister/build/client',
// then svelteAppDir will be "../build/client".
const svelteAppDir = "..app/build/client/.app" // Updated path to point to the Svelte client build output

// imageHandler handles WebSocket connections for image uploads.
func imageHandler(ws *websocket.Conn) {
	log.Printf("New WebSocket connection from %s", ws.RemoteAddr())
	defer ws.Close()

	// Buffer to store incoming data
	// Using a relatively large buffer for image data, adjust as needed.
	// For very large images, streaming in chunks would be more robust.
	var buffer []byte // No initial size, will grow as needed.

	for {
		// Read data from the WebSocket connection
		// N.B.: For large files, a single Read might not get all data.
		// For production, you'd implement a more robust streaming read.
		err := websocket.Message.Receive(ws, &buffer)
		if err != nil {
			if err == io.EOF {
				log.Printf("Client %s disconnected.", ws.RemoteAddr())
			} else {
				log.Printf("Error receiving message from %s: %v", ws.RemoteAddr(), err)
			}
			return // Exit the handler for this connection
		}

		if len(buffer) == 0 {
			log.Printf("Received empty message from %s, ignoring.", ws.RemoteAddr())
			continue
		}

		// Generate a unique filename using a timestamp
		filename := fmt.Sprintf("received_image_%d.png", time.Now().UnixNano())

		// Create a new file to save the image in the current server directory
		file, err := os.Create(filename)
		if err != nil {
			log.Printf("Error creating file %s: %v", filename, err)
			websocket.Message.Send(ws, "Error: Could not save image.")
			continue
		}
		defer file.Close() // Ensure the file is closed

		// Write the received bytes to the file
		n, err := file.Write(buffer)
		if err != nil {
			log.Printf("Error writing to file %s: %v", filename, err)
			websocket.Message.Send(ws, "Error: Could not write image data.")
			continue
		}

		log.Printf("Received and saved %d bytes to %s from %s", n, filename, ws.RemoteAddr())

		// Send a confirmation back to the client
		websocket.Message.Send(ws, fmt.Sprintf("Image '%s' uploaded successfully!", filename))

		// Clear the buffer for the next message, important if Receive appends
		buffer = nil
	}
}

// svelteFileServer serves the static files (HTML, CSS, JS, etc.) of the Svelte app,
// with a fallback to index.html for client-side routing.
func svelteFileServer(w http.ResponseWriter, r *http.Request) {
    // Try to serve the static file requested
    filePath := filepath.Join(svelteAppDir, r.URL.Path)
	fmt.Print("Hello")
    // Check if the requested file exists
    _, err := os.Stat(filePath)
    if err == nil || !os.IsNotExist(err) {
        // If the file exists or it's an error other than "does not exist",
        // then serve it directly using the file server.
        http.FileServer(http.Dir(svelteAppDir)).ServeHTTP(w, r)
        return
    }

    // If the file does NOT exist, it's likely a client-side route.
    // In this case, serve the main index.html file so the Svelte router can handle it.
    http.ServeFile(w, r, filepath.Join(svelteAppDir, "index.html"))
}

func main() {
	// Register the WebSocket handler for the "/ws" endpoint
	http.Handle("/ws", websocket.Handler(imageHandler))

	// Register the handler to serve Svelte static files for all other requests.
	// This should be done carefully to ensure the WebSocket handler is not overridden.
	// http.HandleFunc will take precedence over http.Handle if the path matches exactly.
	http.HandleFunc("/", svelteFileServer)


	log.Println("Go WebSocket image server started on :8080")
	// Start the HTTP server
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
