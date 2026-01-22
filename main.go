package main

import (
	"fmt"
	"net/http"
)

func main() {
	// This line tells Go to look for files (html, css, js) in the current folder
	fs := http.FileServer(http.Dir("./"))

	// This connects the file server to the browser URL
	http.Handle("/", fs)

	fmt.Println("Server avviato su http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
